package com.rishabhroy.MineCam;

import com.rishabhroy.MineCam.Util.Util;

import java.awt.*;

public class HidWrapper {
    public static String minecamhelperpath;
    public static Robot robot;
    private static volatile boolean canSendHelperUpdate = true;

    static void setupMacHelper() {
        HidWrapper.minecamhelperpath = Util.getResourceAsFile("assets/minecam/MineCamHelper", ".MineCamHelper").getAbsolutePath();
        try {
            Runtime.getRuntime().exec("chmod +x " + minecamhelperpath);
        }
        catch (Exception e) {
            e.printStackTrace();
        }
        Util.log("HID: Mac Helper Setup");
    }

    public static void setupHid() {
        Util.log("HID: Starting HID");
        if (Util.IS_MAC) {
            setupMacHelper();
        }
        else {
            System.setProperty("java.awt.headless", "false");
            try {
                robot = new Robot();
                Util.log("HID: Robot instance setup");
            } catch (AWTException e) {
                e.printStackTrace();
            }
        }

        Util.log("HID: HID Setup Complete");
    }

    public static void delay(int ms) {
        if (Util.IS_MAC) {
            canSendHelperUpdate = false;
            Thread thread = new Thread(() -> {
                try {
                    Thread.sleep(ms);
                }
                catch (Exception e) {
                    e.printStackTrace();
                }
                canSendHelperUpdate = true;
            });
            thread.start();
            try {
                Thread.sleep(ms);
            }
            catch (Exception e) {

            }
        }
        else {
            robot.delay(ms);
        }
    }

    public static void runDelayedTask(int ms, Thread run) {
        if (Util.IS_MAC) {
            canSendHelperUpdate = false;
            Thread thread = new Thread(() -> {
                try {
                    Thread.sleep(ms);
                }
                catch (Exception e) {
                    e.printStackTrace();
                }
                canSendHelperUpdate = true;
                run.start();
            });
            thread.start();
        }
        else {
            Thread thread = new Thread(() -> {
                robot.delay(ms);
                run.start();
            });
            thread.start();
        }
    }

    public static void mousePress(int input, String button) {
        if (Util.IS_MAC) {
            try {
                if (canSendHelperUpdate) {
                    Runtime.getRuntime().exec(minecamhelperpath + " mouse 0 0 " + button + " true false false");
                }
            }
            catch (Exception e) {
                e.printStackTrace();
            }
        }
        else {
            robot.mousePress(input);
        }
    }

    public static void mouseRelease(int input, String button) {
        if (Util.IS_MAC) {
            try {
                if (canSendHelperUpdate) {
                    Runtime.getRuntime().exec(minecamhelperpath + " mouse 0 0 " + button + " false true false");
                }
            }
            catch (Exception e) {
                e.printStackTrace();
            }
        }
        else {
            robot.mouseRelease(input);
        }
    }

    public static void mouseMove(int x, int y) {
        if (Util.IS_MAC) {
            try {
                if (canSendHelperUpdate) {
                    Runtime.getRuntime().exec(minecamhelperpath + " mouse " + x + " " + y + " left false false true");
                }
            }
            catch (Exception e) {
                e.printStackTrace();
            }
        }
        else {
            robot.mouseMove(x, y);
        }
    }

    public static void keyPress(int input, String button) {
        if (Util.IS_MAC) {
            try {
                if (canSendHelperUpdate) {
                    Runtime.getRuntime().exec(minecamhelperpath + " keyboard " + button + " true");
                }
            }
            catch (Exception e) {
                e.printStackTrace();
            }
        }
        else {
            robot.keyPress(input);
        }
    }

    public static void keyRelease(int input, String button) {
        if (Util.IS_MAC) {
            try {
                if (canSendHelperUpdate) {
                    Runtime.getRuntime().exec(minecamhelperpath + " keyboard " + button + " false");
                }
            }
            catch (Exception e) {
                e.printStackTrace();
            }
        }
        else {
            robot.keyRelease(input);
        }
    }

}
