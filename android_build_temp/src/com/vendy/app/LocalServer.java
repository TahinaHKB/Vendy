package com.vendy.app;

import android.content.Context;
import java.io.*;
import java.net.*;

public class LocalServer extends Thread {
    private final Context context;
    private ServerSocket serverSocket;
    private int port = 0;
    private volatile boolean running = true;

    public LocalServer(Context context) throws IOException {
        this.context = context;
        // Bind to localhost on any available random free port
        this.serverSocket = new ServerSocket(0, 50, InetAddress.getByName("127.0.0.1"));
        this.port = this.serverSocket.getLocalPort();
    }

    public int getPort() {
        return port;
    }

    @Override
    public void run() {
        while (running && !serverSocket.isClosed()) {
            try {
                Socket client = serverSocket.accept();
                handleClient(client);
            } catch (IOException e) {
                // Socket closed or stopped
            }
        }
    }

    private void handleClient(final Socket socket) {
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
                    String line = in.readLine();
                    if (line == null) {
                        socket.close();
                        return;
                    }
                    String[] parts = line.split(" ");
                    if (parts.length < 2) {
                        socket.close();
                        return;
                    }
                    String reqPath = parts[1];
                    if (reqPath.contains("?")) {
                        reqPath = reqPath.substring(0, reqPath.indexOf("?"));
                    }
                    if (reqPath.contains("#")) {
                        reqPath = reqPath.substring(0, reqPath.indexOf("#"));
                    }
                    if (reqPath.equals("/") || reqPath.isEmpty()) {
                        reqPath = "index.html";
                    }
                    if (reqPath.startsWith("/")) {
                        reqPath = reqPath.substring(1);
                    }

                    InputStream is = null;
                    try {
                        is = context.getAssets().open(reqPath);
                    } catch (IOException e1) {
                        // Fallback to index.html for SPA client-side routes
                        try {
                            is = context.getAssets().open("index.html");
                            reqPath = "index.html";
                        } catch (IOException e2) {
                            OutputStream os = socket.getOutputStream();
                            os.write("HTTP/1.1 404 Not Found\r\n\r\n".getBytes());
                            os.flush();
                            socket.close();
                            return;
                        }
                    }

                    String mime = "application/octet-stream";
                    if (reqPath.endsWith(".html")) mime = "text/html; charset=utf-8";
                    else if (reqPath.endsWith(".js") || reqPath.endsWith(".mjs")) mime = "application/javascript; charset=utf-8";
                    else if (reqPath.endsWith(".css")) mime = "text/css; charset=utf-8";
                    else if (reqPath.endsWith(".svg")) mime = "image/svg+xml";
                    else if (reqPath.endsWith(".png")) mime = "image/png";
                    else if (reqPath.endsWith(".jpg") || reqPath.endsWith(".jpeg")) mime = "image/jpeg";
                    else if (reqPath.endsWith(".json") || reqPath.endsWith(".webmanifest")) mime = "application/json";
                    else if (reqPath.endsWith(".woff2")) mime = "font/woff2";
                    else if (reqPath.endsWith(".woff")) mime = "font/woff";
                    else if (reqPath.endsWith(".ttf")) mime = "font/ttf";
                    else if (reqPath.endsWith(".ico")) mime = "image/x-icon";

                    ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                    byte[] data = new byte[8192];
                    int nRead;
                    while ((nRead = is.read(data, 0, data.length)) != -1) {
                        buffer.write(data, 0, nRead);
                    }
                    is.close();
                    byte[] body = buffer.toByteArray();

                    OutputStream os = socket.getOutputStream();
                    PrintWriter pw = new PrintWriter(os);
                    pw.print("HTTP/1.1 200 OK\r\n");
                    pw.print("Content-Type: " + mime + "\r\n");
                    pw.print("Content-Length: " + body.length + "\r\n");
                    pw.print("Access-Control-Allow-Origin: *\r\n");
                    pw.print("Connection: close\r\n\r\n");
                    pw.flush();
                    os.write(body);
                    os.flush();
                    socket.close();
                } catch (Exception ignored) {
                    try { socket.close(); } catch (Exception ignored2) {}
                }
            }
        }).start();
    }

    public void stopServer() {
        running = false;
        try {
            if (serverSocket != null) {
                serverSocket.close();
            }
        } catch (IOException ignored) {}
    }
}
