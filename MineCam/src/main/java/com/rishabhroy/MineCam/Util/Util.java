package com.rishabhroy.MineCam.Util;

import com.rishabhroy.MineCam.MineCam;
import org.apache.logging.log4j.LogManager;

import java.io.*;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;

public class Util {
    public static ArrayList<File> tempFiles = new ArrayList<>();
    private static String OS = System.getProperty("os.name").toLowerCase();
    public static boolean IS_WINDOWS = (OS.indexOf("win") >= 0);
    public static boolean IS_MAC = (OS.indexOf("mac") >= 0);
    public static boolean IS_UNIX = (OS.indexOf("nix") >= 0 || OS.indexOf("nux") >= 0 || OS.indexOf("aix") > 0);

    // Move resources from inside jar to temp directory, and then get the path
    public static File getResourceAsFile(String resourcePath, String suffix) {
        try {
            InputStream in = MineCam.class.getClassLoader().getResourceAsStream(resourcePath);
            if (in == null) {
                return null;
            }

            File tempFile = File.createTempFile(String.valueOf(in.hashCode()), suffix);
            Util.tempFiles.add(tempFile);

            try (FileOutputStream out = new FileOutputStream(tempFile)) {
                //copy stream
                byte[] buffer = new byte[1024];
                int bytesRead;
                while ((bytesRead = in.read(buffer)) != -1) {
                    out.write(buffer, 0, bytesRead);
                }
            }
            return tempFile;
        } catch (Exception e) {
            e.printStackTrace();
            return null;
        }
    }

    public static void deleteFolderOnExit(Path path) throws IOException {
        Files.walkFileTree(path, new SimpleFileVisitor<Path>() {
            @Override
            public FileVisitResult visitFile(Path file, @SuppressWarnings("unused") BasicFileAttributes attrs) {
                Util.tempFiles.add(file.toFile());
                return FileVisitResult.CONTINUE;
            }
            @Override
            public FileVisitResult preVisitDirectory(Path dir, @SuppressWarnings("unused") BasicFileAttributes attrs) {
                Util.tempFiles.add(dir.toFile());
                return FileVisitResult.CONTINUE;
            }
        });
    }

    // Registers code to delete all the temporary files on exit
    public static void registerDeleteFilesOnExit() {
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            for (File i : Util.tempFiles) {
                i.delete();
            }
        }));
    }

    public static void registerUtils() {
        Util.registerDeleteFilesOnExit();
        Util.log("Util: Registered Utils");
    }

    public static void log(String msg) {
        if (MineCam.logging) {
            LogManager.getLogger().info("[MineCam] " + msg);
        }
    }

}
