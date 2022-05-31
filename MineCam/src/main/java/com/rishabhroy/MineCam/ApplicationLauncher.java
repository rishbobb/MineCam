package com.rishabhroy.MineCam;

import com.rishabhroy.MineCam.Util.Util;

import java.awt.*;
import java.io.File;
import java.io.IOException;
import java.net.URI;

public class ApplicationLauncher {
    public static Process app;
    public static boolean appShouldBeLaunched;
    public static File appExecutable;
    public static Thread appAliveChecker;

    public static void installWebView2() {
        Util.log("Application: Checking/Installing WebView2");
        try {
            Process installproc = Runtime.getRuntime().exec(Util.getResourceAsFile("assets/minecam/MicrosoftEdgeWebview2Setup.exe", ".exe").getAbsolutePath() + " /silent /install");
            while (installproc.isAlive()) {

            }
        } catch (IOException e) {
            e.printStackTrace();
        }
        Util.log("Application: WebView2 is installed");
    }

    public static void launch() {
        Util.log("Application: Beginning Application Launch");
        ApplicationLauncher.appShouldBeLaunched = false;
        try {
            if (Util.IS_WINDOWS) {
                ApplicationLauncher.installWebView2();
                ApplicationLauncher.appExecutable = Util.getResourceAsFile("assets/minecam/MineCam.exe", ".exe");
                Util.log("Application: application executable unpacked");
                ApplicationLauncher.app = Runtime.getRuntime().exec(ApplicationLauncher.appExecutable.getAbsolutePath());
                Util.log("Application: App executable launched");
                ApplicationLauncher.appShouldBeLaunched = true;
                ApplicationLauncher.appAliveChecker = new Thread(() -> {
                    while (ApplicationLauncher.appShouldBeLaunched) {
                        try {
                            if(!ApplicationLauncher.app.isAlive()) {
                                ApplicationLauncher.app = Runtime.getRuntime().exec(ApplicationLauncher.appExecutable.getAbsolutePath());
                            }
                        }
                        catch (Exception e) {

                        }
                    }
                });
                ApplicationLauncher.appAliveChecker.start();
                Runtime.getRuntime().addShutdownHook(new Thread(() -> {
                    ApplicationLauncher.appShouldBeLaunched = false;
                    ApplicationLauncher.app.destroy();
                }));
                Util.log("Application: Alive checker and shutdown handler started");
            }
            else if (Util.IS_MAC){
                Runtime.getRuntime().exec("open http://localhost:5500");
            }
            else if (Util.IS_UNIX) {
                Runtime.getRuntime().exec("xdg-open http://localhost:5500");
            }
            else {
                Desktop.getDesktop().browse(new URI("http://localhost:5500"));
            }

            Util.log("Application: App launched!");
        }
        catch (Exception e) {
            e.printStackTrace();
        }
    }
}
