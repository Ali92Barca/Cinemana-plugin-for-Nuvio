package com.ali.cinemana.local;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.util.Log;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;

public class ProxyService extends Service {
    private static final String TAG = "CinemanaLocal";
    private static final int PORT = 7001;
    private volatile boolean running = false;
    private ServerSocket server;

    @Override public void onCreate() {
        super.onCreate();
        startForeground(77, makeNotification());
        running = true;
        new Thread(this::listen, "CinemanaLocalServer").start();
    }

    private Notification makeNotification() {
        String channel = "cinemana_local_service";
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel c = new NotificationChannel(channel, "Cinemana service", NotificationManager.IMPORTANCE_MIN);
            c.setShowBadge(false);
            ((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).createNotificationChannel(c);
        }
        if (Build.VERSION.SDK_INT >= 26) return new Notification.Builder(this, channel)
            .setContentTitle("Cinemana service")
            .setContentText("Local provider is running")
            .setSmallIcon(android.R.drawable.stat_sys_download_done)
            .setOngoing(true).build();
        return new Notification.Builder(this).setContentTitle("Cinemana service")
            .setContentText("Local provider is running")
            .setSmallIcon(android.R.drawable.stat_sys_download_done).setOngoing(true).build();
    }

    private void listen() {
        try {
            server = new ServerSocket();
            server.setReuseAddress(true);
            server.bind(new InetSocketAddress("127.0.0.1", PORT));
            Log.i(TAG, "Listening on 127.0.0.1:" + PORT);
            while (running) {
                final Socket socket = server.accept();
                new Thread(() -> handle(socket), "CinemanaRequest").start();
            }
        } catch (Exception e) { if (running) Log.e(TAG, "Server stopped", e); }
    }

    private void handle(Socket s) {
        try (Socket socket = s;
             BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.US_ASCII));
             OutputStream out = socket.getOutputStream()) {
            socket.setSoTimeout(15000);
            String line = in.readLine();
            if (line == null) return;
            String[] parts = line.split(" ");
            if (parts.length < 2 || !"GET".equals(parts[0])) { respond(out, 405, "Method Not Allowed", "text/plain", "GET only"); return; }
            String path = parts[1];
            while ((line = in.readLine()) != null && !line.isEmpty()) {}
            if (path.equals("/health") || path.equals("/")) { respond(out, 200, "OK", "application/json; charset=utf-8", "{\"ok\":true,\"service\":\"cinemana-local\",\"port\":7001}"); return; }
            if (!path.startsWith("/api/android/")) { respond(out, 404, "Not Found", "text/plain", "Not found"); return; }
            URL url = new URL("https://cinemana.shabakaty.com" + path);
            HttpURLConnection conn = (HttpURLConnection)url.openConnection();
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(12000); conn.setReadTimeout(20000);
            conn.setRequestProperty("User-Agent", "okhttp/4.9.0");
            conn.setRequestProperty("Accept", "application/json, */*");
            int code = conn.getResponseCode();
            InputStream upstream = code >= 400 ? conn.getErrorStream() : conn.getInputStream();
            byte[] body = upstream == null ? new byte[0] : readAll(upstream);
            String type = conn.getContentType();
            respondBytes(out, code, code == 200 ? "OK" : "Upstream Error", type == null ? "application/json; charset=utf-8" : type, body);
            conn.disconnect();
        } catch (Exception e) { Log.e(TAG, "Request failed", e); }
    }

    private byte[] readAll(InputStream in) throws IOException {
        try (InputStream stream = in; ByteArrayOutputStream b = new ByteArrayOutputStream()) {
            byte[] buf = new byte[8192]; int n;
            while ((n = stream.read(buf)) != -1) b.write(buf, 0, n);
            return b.toByteArray();
        }
    }
    private void respond(OutputStream out, int code, String status, String type, String body) throws IOException {
        respondBytes(out, code, status, type, body.getBytes(StandardCharsets.UTF_8));
    }
    private void respondBytes(OutputStream out, int code, String status, String type, byte[] body) throws IOException {
        String headers = "HTTP/1.1 " + code + " " + status + "\r\nContent-Type: " + type + "\r\nContent-Length: " + body.length + "\r\nAccess-Control-Allow-Origin: *\r\nConnection: close\r\nCache-Control: no-store\r\n\r\n";
        out.write(headers.getBytes(StandardCharsets.US_ASCII)); out.write(body); out.flush();
    }
    @Override public int onStartCommand(Intent intent, int flags, int startId) { return START_STICKY; }
    @Override public void onDestroy() { running = false; try { if (server != null) server.close(); } catch (Exception ignored) {} super.onDestroy(); }
    @Override public IBinder onBind(Intent intent) { return null; }
}
