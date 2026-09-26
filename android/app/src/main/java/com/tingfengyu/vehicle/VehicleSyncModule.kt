package com.tingfengyu.vehicle

import android.content.Context
import android.net.wifi.WifiManager
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.BufferedOutputStream
import java.io.ByteArrayOutputStream
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.net.Inet4Address
import java.net.InetAddress
import java.net.NetworkInterface
import java.net.ServerSocket
import java.net.Socket
import java.net.SocketTimeoutException
import java.nio.charset.StandardCharsets
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.concurrent.thread

/**
 * 听风语局域网同步模块：
 * 车机端启动本地 HTTP 服务，手机扫码访问上传页，
 * 上传音源插件 / music.json，车机自动保存并触发导入。
 */
class VehicleSyncModule(context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {

    private val reactContext: ReactApplicationContext = context
    private var server: ServerSocket? = null
    private val running = AtomicBoolean(false)

    override fun getName(): String = "NativeVehicleSync"

    /** 获取局域网 IPv4 地址 */
    @ReactMethod
    fun getLocalIpAddress(promise: Promise) {
        try {
            val wifiManager = reactContext.applicationContext
                .getSystemService(Context.WIFI_SERVICE) as WifiManager
            @Suppress("DEPRECATION")
            val ip = wifiManager.connectionInfo?.ipAddress ?: 0
            if (ip != 0) {
                promise.resolve(String.format(
                    "%d.%d.%d.%d",
                    ip and 0xff,
                    (ip shr 8) and 0xff,
                    (ip shr 16) and 0xff,
                    (ip shr 24) and 0xff
                ))
                return
            }
            val interfaces = NetworkInterface.getNetworkInterfaces()
            while (interfaces.hasMoreElements()) {
                val intf = interfaces.nextElement()
                val addrs = intf.inetAddresses
                while (addrs.hasMoreElements()) {
                    val addr = addrs.nextElement() as InetAddress
                    if (!addr.isLoopbackAddress && addr is Inet4Address) {
                        promise.resolve(addr.hostAddress)
                        return
                    }
                }
            }
            promise.resolve("")
        } catch (e: Exception) {
            promise.reject("IP_ERROR", e.message)
        }
    }

    /** 启动同步 HTTP 服务 */
    @ReactMethod
    fun startSyncServer(port: Int, promise: Promise) {
        if (running.get()) {
            promise.resolve(true)
            return
        }
        try {
            server = ServerSocket(port, 50)
            running.set(true)
            thread(name = "tingfengyu-sync-server", isDaemon = true) {
                acceptLoop()
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SERVER_ERROR", e.message)
        }
    }

    /** 停止同步服务 */
    @ReactMethod
    fun stopSyncServer() {
        running.set(false)
        try {
            server?.close()
        } catch (_: Exception) {
        }
        server = null
    }

    private fun acceptLoop() {
        try {
            while (running.get()) {
                val socket = server?.accept() ?: return
                thread(name = "tingfengyu-sync-conn", isDaemon = true) {
                    try {
                        handleConnection(socket)
                    } catch (_: Exception) {
                    } finally {
                        try {
                            socket.close()
                        } catch (_: Exception) {
                        }
                    }
                }
            }
        } catch (e: SocketTimeoutException) {
            // 正常关闭
        } catch (_: Exception) {
        }
    }

    private fun handleConnection(socket: Socket) {
        val input = socket.getInputStream()
        val requestLine = readLine(input) ?: return
        val parts = requestLine.split(" ")
        if (parts.size < 3) return
        val method = parts[0]
        val path = parts[1]

        // 读取 headers
        var contentLength = 0
        var contentType = ""
        while (true) {
            val line = readLine(input) ?: break
            if (line.isEmpty()) break
            val idx = line.indexOf(":")
            if (idx > 0) {
                val key = line.substring(0, idx).trim().lowercase()
                val value = line.substring(idx + 1).trim()
                if (key == "content-length") contentLength = value.toIntOrNull() ?: 0
                if (key == "content-type") contentType = value
            }
        }

        val out = BufferedOutputStream(socket.getOutputStream())
        when {
            method == "GET" && (path == "/" || path.startsWith("/?")) -> {
                sendHtml(out, buildUploadPage())
            }
            method == "POST" && path == "/upload" -> {
                handleUpload(input, contentType, contentLength, out)
            }
            else -> {
                sendText(out, "404 Not Found", "text/plain")
            }
        }
        out.flush()
    }

    /** 读取一行（\r\n 或 \n 结尾），以字节方式解析避免破坏后续 body */
    private fun readLine(input: InputStream): String? {
        val buf = ByteArrayOutputStream()
        while (true) {
            val b = input.read()
            if (b == -1) {
                return if (buf.size() > 0) buf.toString(StandardCharsets.UTF_8.name()) else null
            }
            if (b == '\n'.code) {
                var s = buf.toString(StandardCharsets.UTF_8.name())
                if (s.endsWith("\r")) s = s.dropLast(1)
                return s
            }
            buf.write(b)
        }
    }

    private fun handleUpload(
        input: InputStream,
        contentType: String,
        contentLength: Int,
        out: BufferedOutputStream,
    ) {
        try {
            // 按字节读取 body
            val body = ByteArrayOutputStream()
            val buffer = ByteArray(8192)
            var total = 0
            while (total < contentLength) {
                val read = input.read(buffer, 0, minOf(8192, contentLength - total))
                if (read <= 0) break
                body.write(buffer, 0, read)
                total += read
            }
            val bodyBytes = body.toByteArray()

            val boundaryMatch = Regex("boundary=(.+)").find(contentType)
            if (boundaryMatch == null) {
                // 非 multipart：整段作为插件内容
                savePluginFile("plugin_${System.currentTimeMillis()}.js", bodyBytes)
                emitUploadSuccess(null, null)
                sendText(out, "上传成功，音源已导入", "text/html; charset=utf-8")
                return
            }

            val boundary = "--" + boundaryMatch.groupValues[1].trim('"')
            // multipart 按二进制边界分割
            val segments = splitByBoundary(bodyBytes, boundary.toByteArray(StandardCharsets.UTF_8))
            var savedCount = 0
            for (segment in segments) {
                val headerEnd = indexOfBytes(segment, "\r\n\r\n".toByteArray(StandardCharsets.UTF_8))
                if (headerEnd < 0) continue
                val headerPart = String(segment, 0, headerEnd, StandardCharsets.UTF_8)
                val filenameMatch = Regex("filename=\"([^\"]+)\"").find(headerPart)
                val filename = filenameMatch?.groupValues?.get(1) ?: continue
                val contentStart = headerEnd + 4
                val fileContent = segment.copyOfRange(contentStart, segment.size)
                    .let { raw ->
                        // 去掉结尾的 \r\n
                        val end = raw.size
                        if (end >= 2 && raw[end - 2] == '\r'.code.toByte() && raw[end - 1] == '\n'.code.toByte()) {
                            raw.copyOfRange(0, end - 2)
                        } else raw
                    }
                val savedName = savePluginFile(filename, fileContent)
                if (savedName != null) {
                    savedCount++
                    emitUploadSuccess(filename, savedName)
                }
            }
            sendText(
                out,
                if (savedCount > 0) "上传成功，共导入 $savedCount 个音源文件" else "未识别到有效文件",
                "text/html; charset=utf-8"
            )
        } catch (e: Exception) {
            sendText(out, "上传失败: ${e.message}", "text/html; charset=utf-8")
        }
    }

    /** 按二进制边界切分 multipart 段 */
    private fun splitByBoundary(body: ByteArray, boundary: ByteArray): List<ByteArray> {
        val result = mutableListOf<ByteArray>()
        var start = 0
        var idx = indexOfBytes(body, boundary, start)
        while (idx >= 0) {
            // 段内容为 boundary 之后到下一个 boundary 之前
            val contentStart = idx + boundary.size
            // 跳过段首的 \r\n
            var segStart = contentStart
            if (segStart + 2 <= body.size &&
                body[segStart] == '\r'.code.toByte() &&
                body[segStart + 1] == '\n'.code.toByte()
            ) {
                segStart += 2
            }
            val next = indexOfBytes(body, boundary, contentStart)
            if (next < 0) break
            // 段尾去掉 \r\n
            var segEnd = next
            if (segEnd >= 2 && body[segEnd - 2] == '\r'.code.toByte() && body[segEnd - 1] == '\n'.code.toByte()) {
                segEnd -= 2
            }
            if (segEnd > segStart) {
                result.add(body.copyOfRange(segStart, segEnd))
            }
            start = next
            idx = indexOfBytes(body, boundary, start)
            if (idx == next) break
        }
        return result
    }

    private fun indexOfBytes(data: ByteArray, target: ByteArray, fromIndex: Int = 0): Int {
        if (target.isEmpty()) return -1
        outer@ for (i in fromIndex..data.size - target.size) {
            for (j in target.indices) {
                if (data[i + j] != target[j]) continue@outer
            }
            return i
        }
        return -1
    }

    /** 保存插件/音源文件到插件目录 */
    private fun savePluginFile(originalName: String, content: ByteArray): String? {
        try {
            val pluginDir = File(reactContext.getExternalFilesDir(null), "plugins")
            if (!pluginDir.exists()) pluginDir.mkdirs()
            val safeName = originalName.replace(Regex("[^\\w\\-. ]"), "_")
            val target = if (safeName.endsWith(".js") || safeName.endsWith(".json")) {
                File(pluginDir, safeName)
            } else {
                File(pluginDir, "$safeName.js")
            }
            FileOutputStream(target).use { it.write(content) }
            return target.name
        } catch (_: Exception) {
            return null
        }
    }

    private fun emitUploadSuccess(filename: String?, savedName: String?) {
        val map: WritableMap = Arguments.createMap()
        if (filename != null) map.putString("filename", filename)
        if (savedName != null) map.putString("savedName", savedName)
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("vehicleSyncFileUploaded", map)
    }

    private fun sendHtml(out: BufferedOutputStream, html: String) {
        val bytes = html.toByteArray(StandardCharsets.UTF_8)
        out.write(("HTTP/1.1 200 OK\r\n" +
                "Content-Type: text/html; charset=utf-8\r\n" +
                "Content-Length: ${bytes.size}\r\n" +
                "Connection: close\r\n\r\n").toByteArray(StandardCharsets.UTF_8))
        out.write(bytes)
    }

    private fun sendText(out: BufferedOutputStream, text: String, type: String) {
        val bytes = text.toByteArray(StandardCharsets.UTF_8)
        out.write(("HTTP/1.1 200 OK\r\n" +
                "Content-Type: $type\r\n" +
                "Content-Length: ${bytes.size}\r\n" +
                "Connection: close\r\n\r\n").toByteArray(StandardCharsets.UTF_8))
        out.write(bytes)
    }

    private fun buildUploadPage(): String {
        return """
            <!DOCTYPE html>
            <html lang="zh-CN">
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <title>听风语 · 音源同步</title>
              <style>
                body { font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
                       background: linear-gradient(135deg, #1a1a2e, #16213e, #0f3460);
                       color: #fff; margin: 0; min-height: 100vh; display: flex;
                       flex-direction: column; align-items: center; justify-content: center; }
                .card { background: rgba(255,255,255,0.08); border-radius: 20px;
                        padding: 40px 32px; width: min(420px, 88vw); text-align: center;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.4); }
                h1 { font-size: 26px; margin: 0 0 8px; letter-spacing: 2px; }
                p  { color: rgba(255,255,255,0.7); font-size: 14px; margin: 8px 0 24px; }
                .drop { border: 2px dashed rgba(255,255,255,0.35); border-radius: 16px;
                        padding: 32px 16px; cursor: pointer; transition: all .2s; }
                .drop:hover { border-color: #4fc3f7; background: rgba(79,195,247,0.08); }
                .drop.on { border-color: #4fc3f7; background: rgba(79,195,247,0.12); }
                .btn { background: #4fc3f7; color: #062; border: none; border-radius: 12px;
                       font-size: 16px; font-weight: 600; padding: 14px 0; width: 100%;
                       margin-top: 16px; cursor: pointer; }
                .hint { font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 20px; }
                input[type=file] { display: none; }
                #status { margin-top: 16px; font-size: 14px; min-height: 20px; }
              </style>
            </head>
            <body>
              <div class="card">
                <h1>听风语 · 音源同步</h1>
                <p>手机与车机在同一 WiFi 下，上传音源插件 / music.json</p>
                <label class="drop" id="drop">
                  <div style="font-size:44px">📁</div>
                  <div style="font-size:16px;font-weight:600">点击选择文件</div>
                  <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:6px">支持 .js 插件 / .json 音源，可多选</div>
                  <input type="file" id="file" multiple accept=".js,.json,.txt">
                </label>
                <button class="btn" id="upload" disabled>上传并导入</button>
                <div id="status"></div>
                <div class="hint">听风语车载音乐播放器 · 数据仅在本机局域网传输</div>
              </div>
              <script>
                var files = [];
                var drop = document.getElementById('drop');
                var input = document.getElementById('file');
                var btn = document.getElementById('upload');
                var status = document.getElementById('status');
                drop.addEventListener('click', function(){ input.click(); });
                drop.addEventListener('dragover', function(e){ e.preventDefault(); drop.classList.add('on'); });
                drop.addEventListener('dragleave', function(){ drop.classList.remove('on'); });
                drop.addEventListener('drop', function(e){ e.preventDefault(); drop.classList.remove('on'); files = e.dataTransfer.files; sync(); });
                input.addEventListener('change', function(){ files = input.files; sync(); });
                function sync(){
                  if(!files.length) return;
                  btn.disabled = true;
                  status.textContent = '上传中…';
                  var fd = new FormData();
                  for(var i=0;i<files.length;i++){ fd.append('file'+i, files[i]); }
                  fetch('/upload', { method:'POST', body: fd }).then(function(r){ return r.text(); })
                    .then(function(t){ status.textContent = t; btn.disabled = false; })
                    .catch(function(e){ status.textContent = '上传失败: ' + e; btn.disabled = false; });
                }
                btn.addEventListener('click', sync);
              </script>
            </body>
            </html>
        """.trimIndent()
    }
}
