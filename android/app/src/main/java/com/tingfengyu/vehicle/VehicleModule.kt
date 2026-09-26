package com.tingfengyu.vehicle

import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * 听风语车载原生模块：
 * 1. 音频焦点适配（导航播报时自动暂停/恢复）
 * 2. 前台服务保活（熄屏/后台不杀进程）
 */
class VehicleModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {

    private val reactContext: ReactApplicationContext = context
    private var audioManager: AudioManager? = null
    private var audioFocusRequest: AudioFocusRequest? = null
    private var focusHeld = false

    private val focusChangeListener = AudioManager.OnAudioFocusChangeListener { focusChange ->
        val map: WritableMap = Arguments.createMap()
        when (focusChange) {
            AudioManager.AUDIOFOCUS_GAIN -> {
                focusHeld = true
                map.putInt("state", 1) // 获得焦点
                map.putString("type", "gain")
            }
            AudioManager.AUDIOFOCUS_LOSS -> {
                focusHeld = false
                map.putInt("state", 2) // 永久丢失（导航等抢占）
                map.putString("type", "loss")
            }
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> {
                focusHeld = false
                map.putInt("state", 3) // 临时丢失（导航播报）
                map.putString("type", "lossTransient")
            }
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> {
                map.putInt("state", 4) // 可降低音量
                map.putString("type", "lossTransientCanDuck")
            }
            else -> return@OnAudioFocusChangeListener
        }
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("vehicleAudioFocusChange", map)
    }

    override fun getName(): String = "NativeVehicle"

    @ReactMethod
    fun requestAudioFocus(promise: Promise) {
        try {
            val am = reactContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
            audioManager = am
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                    .setAudioAttributes(
                        AudioAttributes.Builder()
                            .setUsage(AudioAttributes.USAGE_MEDIA)
                            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                            .build()
                    )
                    .setOnAudioFocusChangeListener(focusChangeListener)
                    .setWillPauseWhenDucked(false)
                    .build()
                audioFocusRequest = request
                val result = am.requestAudioFocus(request)
                promise.resolve(result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED)
            } else {
                @Suppress("DEPRECATION")
                val result = am.requestAudioFocus(
                    focusChangeListener,
                    AudioManager.STREAM_MUSIC,
                    AudioManager.AUDIOFOCUS_GAIN
                )
                promise.resolve(result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED)
            }
        } catch (e: Exception) {
            promise.reject("AUDIO_FOCUS_ERROR", e.message)
        }
    }

    @ReactMethod
    fun abandonAudioFocus() {
        try {
            val am = audioManager ?: return
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                audioFocusRequest?.let { am.abandonAudioFocusRequest(it) }
            } else {
                @Suppress("DEPRECATION")
                am.abandonAudioFocus(focusChangeListener)
            }
            focusHeld = false
        } catch (_: Exception) {
        }
    }

    @ReactMethod
    fun hasAudioFocus(promise: Promise) {
        promise.resolve(focusHeld)
    }

    /** 启动前台保活服务 */
    @ReactMethod
    fun startKeepAliveService(title: String, content: String) {
        try {
            val intent = Intent(reactContext, VehicleKeepAliveService::class.java)
                .putExtra("title", title)
                .putExtra("content", content)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactContext.startForegroundService(intent)
            } else {
                reactContext.startService(intent)
            }
        } catch (_: Exception) {
        }
    }

    /** 停止前台保活服务 */
    @ReactMethod
    fun stopKeepAliveService() {
        try {
            reactContext.stopService(
                Intent(reactContext, VehicleKeepAliveService::class.java)
            )
        } catch (_: Exception) {
        }
    }

    companion object {
        const val CHANNEL_ID = "vehicle_keep_alive"
    }
}
