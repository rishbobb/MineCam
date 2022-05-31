package com.rishabhroy.MineCam;

import com.rishabhroy.MineCam.Util.Util;
import net.minecraftforge.common.MinecraftForge;
import net.minecraftforge.fml.common.Mod;
import net.minecraftforge.fml.event.lifecycle.FMLCommonSetupEvent;
import net.minecraftforge.fml.javafmlmod.FMLJavaModLoadingContext;
import org.java_websocket.server.WebSocketServer;

import java.net.InetSocketAddress;

@Mod("minecam")
public class MineCam {
    public static boolean logging = true;
    public MineCam() {
        FMLJavaModLoadingContext.get().getModEventBus().addListener(this::setup);
        MinecraftForge.EVENT_BUS.register(this);
    }

    private void setup(final FMLCommonSetupEvent event) {
        Util.log("Setup: MineCam Loading Started");

        // Params for websocket server
        String host = "localhost";
        int port = 6969;

        // Setup HID
        HidWrapper.setupHid();

        // Setup websocket server backend
        WebSocketServer endpoint = new WebsocketEndpoint(new InetSocketAddress(host, port));
        Thread minecamThread = new Thread(() -> {
            endpoint.run();
        });
        minecamThread.start();

        // Setup web server for frontend
        WebServer.startWebServer();

        // Launch application for frontend
        ApplicationLauncher.launch();

        // Register Utils
        Util.registerUtils();

        Util.log("Setup: MineCam was successfully started!");

    }
}
