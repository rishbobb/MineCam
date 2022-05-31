package com.rishabhroy.MineCam;

import java.io.*;
import java.nio.file.*;

import com.rishabhroy.MineCam.Util.ProcessOutputRedirectThread;
import com.rishabhroy.MineCam.Util.Util;
import net.lingala.zip4j.ZipFile;

public class WebServer {
    public static Process webserver;

    public static String unzipWebFolder(String path) {
        try {
            Path TempDir = Files.createTempDirectory("MineCamTemp");

            Util.deleteFolderOnExit(TempDir);

            ZipFile zipFile = new ZipFile(path);
            zipFile.extractAll(TempDir.toFile().getAbsolutePath());

            return TempDir.toFile().getAbsolutePath();
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    public static String createWebFiles() {
        String zipPath = Util.getResourceAsFile("assets/minecam/minecam-web.zip", ".zip").getAbsolutePath();
        String appFolder = unzipWebFolder(zipPath);

        if (Util.IS_WINDOWS) {
            return appFolder + "\\minecam-web";
        }
        else {
            return appFolder + "/minecam-web";
        }
    }

    public static void startWebServer() {
        Util.log("Web: Starting web server!");
        try {
            File webServerJar = Util.getResourceAsFile("assets/minecam/MineCamWebServer.jar", ".jar");
            Util.log("Web: unpacked jarfile");

            //get java executable
            String javaLibraryPath = System.getProperty("java.library.path");

            File javaExeFile;
            String javaExePath;
            try {
                if (Util.IS_WINDOWS) {
                    javaExeFile = new File(javaLibraryPath.substring(0, javaLibraryPath.indexOf(';')) + "\\java.exe");
                }
                else {
                    javaExeFile = new File(javaLibraryPath.substring(0, javaLibraryPath.indexOf(':')) + "/java");
                }
                javaExePath = javaExeFile.exists() ? javaExeFile.getAbsolutePath() : "java";
            }
            catch (Exception e) {
                javaExePath = "java";
            }
            Util.log("Web: java executable located");

            String webFolderPath = createWebFiles();
            Util.log("Web: web folder unpacked");

            ProcessBuilder builder;

            if (Util.IS_UNIX) {
                builder = new ProcessBuilder("bash", "-c", javaExePath + " -jar " + webServerJar.getAbsolutePath() + " .");
            }
            else {
                builder = new ProcessBuilder(javaExePath, "-jar", webServerJar.getAbsolutePath(), ".");
            }
            builder.directory(new File(webFolderPath).getAbsoluteFile());
            WebServer.webserver = builder.start();
            Util.log("Web: server started");

            ProcessOutputRedirectThread inputRedirectThread = new ProcessOutputRedirectThread(WebServer.webserver.getInputStream());
            ProcessOutputRedirectThread errorRedirectThread = new ProcessOutputRedirectThread(WebServer.webserver.getErrorStream());
            inputRedirectThread.start();
            errorRedirectThread.start();
            Util.log("Web: process output redirected");

            Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                WebServer.webserver.destroy();
            }));
        }
        catch(Exception e) {
            e.printStackTrace();
        }
    }


}
