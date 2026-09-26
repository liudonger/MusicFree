package com.tingfengyu.vehicle

import android.media.audiofx.BassBoost
import android.media.audiofx.Equalizer
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

    override fun getName(): String = "NativeSoundEffect"

    /** 设置音频会话 ID（播放器会话），必须先于其他调用 */
    @ReactMethod
    fun attachSession(session: Int) {
        sessionId = session
        releaseEffects()
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

    /** 复位所有音效 */
    @ReactMethod
    fun resetEffects() {
        try {
            equalizer?.usePreset(0.toShort())
            equalizer?.enabled = false
            bassBoost?.enabled = false
            virtualizer?.enabled = false
        } catch (_: Exception) {
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
        } catch (_: Exception) {
        }
        equalizer = null
        virtualizer = null
        bassBoost = null
    }
}
