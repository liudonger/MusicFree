package com.tingfengyu.vehicle

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import com.tingfengyu.MainActivity

/**
 * 听风语前台保活服务：
 * 车载场景熄屏/后台时保持进程存活，音乐持续播放。
 * 全部异常防御：任何设备/ROM 异常都不允许导致应用崩溃。
 */
class VehicleKeepAliveService : Service() {

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        try {
            val title = intent?.getStringExtra("title") ?: "听风语"
            val content = intent?.getStringExtra("content") ?: "车载音乐播放中"
            startAsForeground(title, content)
        } catch (_: Exception) {
            // 保活服务失败不影响主应用
            stopSelf()
        }
        return START_STICKY
    }

    private fun startAsForeground(title: String, content: String) {
        val channelId = VehicleModule.CHANNEL_ID
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId,
                "车载播放保活",
                NotificationManager.IMPORTANCE_LOW
            )
            channel.setShowBadge(false)
            manager.createNotificationChannel(channel)
        }

        // 显式 Intent 指向包内 Activity，避免 launchIntent 为 null 导致异常
        val notificationIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            notificationIntent,
            PendingIntent.FLAG_IMMUTABLE
        )

        val notification: Notification = Notification.Builder(this, channelId)
            .setContentTitle(title)
            .setContentText(content)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(1001, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
        } else {
            startForeground(1001, notification)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
    }
}
