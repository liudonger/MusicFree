package com.tingfengyu.vehicle

import android.media.audiofx.BassBoost
import android.media.audiofx.Equalizer
import android.media.audiofx.PresetReverb
import android.media.audiofx.Virtualizer
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.WritableMap

/**
 * 听风语车载音效模块：
 * 基于 Android AudioEffect 实现 EQ / 环绕 / 重低音 / 人声增强预设。
 */
class VehicleSoundEffectModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {

    private val reactContext: ReactApplicationContext = context
    private var sessionId: Int = 0

    private var equalizer: Equalizer? = null
    private var virtualizer: Virtualizer? = null
    private var bassBoost: BassBoost? = null
    private var reverb: PresetReverb? = null

    override fun getName(): String = "NativeSoundEffect"

    /** 设置音频会话 ID（播放器会话），必须先于其他调用 */
    @ReactMethod
    fun attachSession(session: Int) {
        sessionId = session
        releaseEffects()
    }

    /**
     * 自动探测当前活跃的媒体播放会话并挂载音效（无需 JS 传入 session id）。
     * 优先从 TrackPlayer（kotlinaudio）反射拿真实 audioSessionId；
     * 失败时回退到 activePlaybackConfigurations 探测。
     */
    @ReactMethod
    fun attachToActiveSession(promise: Promise) {
        try {
            var targetSession = resolveTrackPlayerSession()
            if (targetSession == 0) {
                targetSession = probeActiveConfigurations()
            }
            android.util.Log.d("TYF_SOUND", "targetSession=" + targetSession)
            if (targetSession == 0) {
                promise.reject("SESSION_NOT_FOUND", "未检测到活跃播放会话，请先播放一首歌后再开启音效")
                return
            }
            sessionId = targetSession
            releaseEffects()
            promise.resolve(targetSession)
        } catch (e: Exception) {
            promise.reject("SESSION_ERROR", e.message)
        }
    }

    /**
     * 反射链路：MusicModule.musicService.player(BaseAudioPlayer).getExoPlayer().getAudioSessionId()
     * TrackPlayer 4.x（kotlinaudio v2.1.0）私有字段，运行时反射获取。
     */
    private fun resolveTrackPlayerSession(): Int {
        return try {
            // RN 0.76：getNativeModule(Class) 强制要求 @ReactModule 注解，track-player 的 MusicModule 无注解
            // → 改为遍历 getNativeModules() 直接取实例（legacy 模块均在列表中）
            val getNms = reactContext.javaClass.methods.firstOrNull {
                it.name == "getNativeModules" && it.parameterCount == 0
            } ?: return 0
            val modules = getNms.invoke(reactContext) as? Iterable<*> ?: return 0
            var musicModule: Any? = null
            for (m in modules) {
                val clsName = m?.javaClass?.name ?: continue
                if (clsName == "com.doublesymmetry.trackplayer.module.MusicModule" ||
                    clsName.endsWith(".MusicModule")
                ) {
                    musicModule = m
                    break
                }
            }
            if (musicModule == null) {
                android.util.Log.d("TYF_SOUND", "MusicModule not found in getNativeModules")
                return 0
            }
            val fService = musicModule.javaClass.getDeclaredField("musicService")
            fService.isAccessible = true
            val service = fService.get(musicModule) ?: return 0
            val fPlayer = service.javaClass.getDeclaredField("player")
            fPlayer.isAccessible = true
            val player = fPlayer.get(service) ?: return 0
            val baseCls = Class.forName("com.doublesymmetry.kotlinaudio.players.BaseAudioPlayer")
            val mGetExo = baseCls.getDeclaredMethod("getExoPlayer")
            mGetExo.isAccessible = true
            val exo = mGetExo.invoke(player) ?: return 0
            val mSession = exo.javaClass.methods.firstOrNull { it.name == "getAudioSessionId" } ?: return 0
            val sid = mSession.invoke(exo) as? Int ?: 0
            android.util.Log.d("TYF_SOUND", "resolveTrackPlayerSession=" + sid)
            sid
        } catch (e: Exception) {
            val cause = if (e is java.lang.reflect.InvocationTargetException) e.cause else e
            android.util.Log.d("TYF_SOUND", "resolveTrackPlayerSession err=" + e + " cause=" + cause)
            0
        }
    }

    /** 回退探测：系统活跃播放配置（部分 ROM 会隐藏 sessionId，故仅作兜底） */
    private fun probeActiveConfigurations(): Int {
        var targetSession = 0
        try {
            val audioManager = reactContext.getSystemService(
                android.content.Context.AUDIO_SERVICE
            ) as? android.media.AudioManager
            if (audioManager != null && android.os.Build.VERSION.SDK_INT >= 26) {
                val configs = audioManager.activePlaybackConfigurations
                android.util.Log.d("TYF_SOUND", "probe configs.size=" + configs.size)
                for (c in configs) {
                    val usage = c.audioAttributes?.usage
                    val sid = getSessionIdOf(c)
                    android.util.Log.d("TYF_SOUND", "cfg usage=" + usage + " sid=" + sid)
                    if (sid > 0 &&
                        usage == android.media.AudioAttributes.USAGE_MEDIA
                    ) {
                        targetSession = sid
                        break
                    }
                }
                if (targetSession == 0 && configs.isNotEmpty()) {
                    targetSession = getSessionIdOf(configs[0])
                }
            }
        } catch (e: Exception) {
            android.util.Log.d("TYF_SOUND", "probe err=" + e)
        }
        return targetSession
    }

    /** 查询 EQ 频段数量与中心频率（用于渲染滑块 UI） */
    @ReactMethod
    fun getBandInfo(promise: Promise) {
        try {
            val eq = ensureEqualizer() ?: run {
                promise.reject("EQ_ERROR", "无音频会话")
                return
            }
            val bands = eq.numberOfBands.toInt()
            val range = eq.bandLevelRange
            val map: WritableMap = Arguments.createMap()
            map.putInt("bands", bands)
            map.putInt("min", range[0].toInt())
            map.putInt("max", range[1].toInt())
            val freqs = Arguments.createArray()
            for (i in 0 until bands) {
                freqs.pushInt(eq.getCenterFreq(i.toShort()).toInt())
            }
            map.putArray("centerFreqs", freqs)
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("EQ_ERROR", e.message)
        }
    }

    /** 查询当前各频段增益（mB），用于回显滑块 */
    @ReactMethod
    fun getBandLevels(promise: Promise) {
        try {
            val eq = ensureEqualizer() ?: run {
                promise.reject("EQ_ERROR", "无音频会话")
                return
            }
            val bands = eq.numberOfBands.toInt()
            val arr = Arguments.createArray()
            for (i in 0 until bands) {
                arr.pushInt(eq.getBandLevel(i.toShort()).toInt())
            }
            promise.resolve(arr)
        } catch (e: Exception) {
            promise.reject("EQ_ERROR", e.message)
        }
    }

    /** 查询系统支持的 EQ 频段范围 */
    @ReactMethod
    fun getBandLevelRange(promise: Promise) {
        try {
            val eq = ensureEqualizer() ?: run {
                promise.reject("EQ_ERROR", "无音频会话")
                return
            }
            val range = eq.bandLevelRange
            val map: WritableMap = Arguments.createMap()
            map.putInt("min", range[0].toInt())
            map.putInt("max", range[1].toInt())
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("EQ_ERROR", e.message)
        }
    }

    /** 设置某个频段的增益（mB） */
    @ReactMethod
    fun setBandLevel(band: Int, level: Int) {
        try {
            val eq = ensureEqualizer() ?: return
            val range = eq.bandLevelRange
            eq.setBandLevel(
                band.toShort(),
                level.coerceIn(range[0].toInt(), range[1].toInt()).toShort()
            )
        } catch (_: Exception) {
        }
    }

    /** 设置自定义 EQ（10 段增益数组，mB） */
    @ReactMethod
    fun setEqualizer(levels: ReadableArray) {
        try {
            val eq = ensureEqualizer() ?: return
            val bandCount = eq.numberOfBands.toInt()
            val range = eq.bandLevelRange
            for (i in 0 until bandCount) {
                if (i < levels.size()) {
                    eq.setBandLevel(
                        i.toShort(),
                        levels.getInt(i).coerceIn(range[0].toInt(), range[1].toInt()).toShort()
                    )
                }
            }
        } catch (_: Exception) {
        }
    }

    /** 应用预设音效 */
    @ReactMethod
    fun applyPreset(preset: String) {
        try {
            val eq = ensureEqualizer() ?: return
            val bandCount = eq.numberOfBands.toInt()
            val range = eq.bandLevelRange

            fun gain(mb: Int): Short = mb.coerceIn(range[0].toInt(), range[1].toInt()).toShort()

            val levels: List<Int> = when (preset) {
                "澎湃外放" -> listOf(400, 300, 250, 200, 150, 150, 200, 250, 300, 400)
                "臻享环绕" -> listOf(150, 100, 50, 0, -50, 0, 100, 150, 200, 250)
                "DTS" -> listOf(300, 250, 150, 100, 0, -100, 0, 150, 250, 350)
                "悦耳人声" -> listOf(-100, -50, 0, 100, 250, 300, 250, 100, 0, -50)
                "剧院模式" -> listOf(250, 200, 100, 0, -50, 0, 100, 200, 300, 350)
                "重低音" -> listOf(500, 400, 300, 150, 0, -100, -150, -100, 0, 50)
                "均衡" -> listOf(0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
                else -> null
            } ?: run {
                resetEffects()
                return
            }

            for (i in 0 until bandCount.coerceAtMost(levels.size)) {
                eq.setBandLevel(i.toShort(), gain(levels[i]))
            }

            // 预设联动
            when (preset) {
                "重低音" -> setBassBoost(0.8)
                "DTS", "剧院模式" -> setVirtualizer(0.7)
                else -> {
                    setBassBoost(0.0)
                    setVirtualizer(0.0)
                }
            }
        } catch (_: Exception) {
        }
    }

    /** 重低音强度 0..1 */
    @ReactMethod
    fun setBassBoost(strength: Double) {
        try {
            val session = sessionId
            if (session == 0) return
            if (bassBoost == null) {
                bassBoost = BassBoost(0, session)
            }
            val bb = bassBoost ?: return
            if (bb.strengthSupported) {
                val shortValue = (strength.coerceIn(0.0, 1.0) * 1000).toInt().toShort()
                bb.enabled = strength > 0
                bb.setStrength(shortValue)
            }
        } catch (_: Exception) {
        }
    }

    /** 环绕强度 0..1 */
    @ReactMethod
    fun setVirtualizer(strength: Double) {
        try {
            val session = sessionId
            if (session == 0) return
            if (virtualizer == null) {
                virtualizer = Virtualizer(0, session)
            }
            val v = virtualizer ?: return
            if (v.strengthSupported) {
                val shortValue = (strength.coerceIn(0.0, 1.0) * 1000).toInt().toShort()
                v.enabled = strength > 0
                v.setStrength(shortValue)
            }
        } catch (_: Exception) {
        }
    }

    /** 音域回响（混响）："关闭"/"小房间"/"中房间"/"大房间"/"中厅"/"大厅"/"舞台" */
    @ReactMethod
    fun setReverb(preset: String) {
        try {
            val session = sessionId
            if (session == 0) return
            if (reverb == null) {
                reverb = PresetReverb(0, session)
            }
            val r = reverb ?: return
            val p: Short = when (preset) {
                "小房间" -> PresetReverb.PRESET_SMALLROOM
                "中房间" -> PresetReverb.PRESET_MEDIUMROOM
                "大房间" -> PresetReverb.PRESET_LARGEROOM
                "中厅" -> PresetReverb.PRESET_MEDIUMHALL
                "大厅" -> PresetReverb.PRESET_LARGEHALL
                "舞台" -> PresetReverb.PRESET_PLATE
                else -> PresetReverb.PRESET_NONE
            }
            r.preset = p
            r.enabled = p != PresetReverb.PRESET_NONE
        } catch (_: Exception) {
        }
    }

    /** 复位所有音效 */
    @ReactMethod
    fun resetEffects() {
        try {
            equalizer?.usePreset(0.toShort())
            equalizer?.enabled = false
            bassBoost?.enabled = false
            virtualizer?.enabled = false
            reverb?.preset = PresetReverb.PRESET_NONE
            reverb?.enabled = false
        } catch (_: Exception) {
        }
    }

    /**
     * 获取 AudioPlaybackConfiguration 的真实播放会话 ID。
     * 优先反射调用公共方法 getAudioSessionId()（API 28+，避免编译期 API 级别约束），
     * 失败时回退读取 AOSP 标准私有字段 mSessionId（兼容国产 ROM 变异字段名）。
     */
    private fun getSessionIdOf(config: android.media.AudioPlaybackConfiguration): Int {
        // 公共方法 getAudioSessionId()（API 28+）
        try {
            val method = config.javaClass.getMethod("getAudioSessionId")
            return method.invoke(config) as Int
        } catch (_: Exception) {
        }
        // 回退：私有字段 mSessionId
        return try {
            val field = config.javaClass.getDeclaredField("mSessionId")
            field.isAccessible = true
            field.getInt(config)
        } catch (_: Exception) {
            0
        }
    }

    private fun ensureEqualizer(): Equalizer? {
        val session = sessionId
        if (session == 0) return null
        if (equalizer == null) {
            equalizer = Equalizer(0, session)
            equalizer?.enabled = true
        }
        return equalizer
    }

    private fun releaseEffects() {
        try {
            equalizer?.release()
            virtualizer?.release()
            bassBoost?.release()
            reverb?.release()
        } catch (_: Exception) {
        }
        equalizer = null
        virtualizer = null
        bassBoost = null
        reverb = null
    }
}
