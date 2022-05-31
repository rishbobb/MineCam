package com.rishabhroy.MineCam;

import com.rishabhroy.MineCam.Util.Util;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.screens.*;
import net.minecraft.client.gui.screens.inventory.*;
import net.minecraft.world.entity.player.Player;

import org.java_websocket.WebSocket;
import org.java_websocket.handshake.ClientHandshake;
import org.java_websocket.server.WebSocketServer;
import org.json.JSONObject;

import javax.swing.*;
import java.awt.event.InputEvent;
import java.awt.event.KeyEvent;
import java.net.InetSocketAddress;
import java.nio.ByteBuffer;
import java.util.ArrayList;

public class WebsocketEndpoint extends WebSocketServer {

    Boolean leftpressed = false;
    Boolean rightpressed = false;
    Boolean walking = false;
    Boolean escpressed = false;
    Boolean epressed = false;
    int lastSentRightHand = 0;

    public WebsocketEndpoint(InetSocketAddress address) {
        super(address);
    }

    @Override
    public void onOpen(WebSocket conn, ClientHandshake handshake) {
        Util.log("Backend: New connection to " + conn.getRemoteSocketAddress());
    }

    @Override
    public void onClose(WebSocket conn, int code, String reason, boolean remote) {}

    @Override
    public void onMessage(WebSocket conn, String message) {
        // Get current screen
        Screen screen = Minecraft.getInstance().screen;

        // Get current player
        Player player = Minecraft.getInstance().player;

        // Create a JSON object from the data received
        JSONObject values = new JSONObject(message);

        // Do action based on what screen is present
        if (screen == null) {
            // In game
            if (values.getInt("type") == 0) {
                player.setXRot(values.getInt("pitch"));
                player.setYRot(values.getInt("yaw"));
            }
            if (values.getInt("type") == 3) {
                // Mining
                if (values.getBoolean("mining")) {
                    HidWrapper.mousePress(InputEvent.BUTTON1_DOWN_MASK, "left");
                    HidWrapper.delay(80);
                    HidWrapper.mouseRelease(InputEvent.BUTTON1_DOWN_MASK, "left");
                }
                // Walking
                if (values.getBoolean("walking")) {
                    if (!this.walking) {
                        HidWrapper.keyPress(KeyEvent.VK_W, "w");
                        this.walking = true;
                    }
                } else {
                    if (this.walking) {
                        HidWrapper.keyRelease(KeyEvent.VK_W, "w");
                        this.walking = false;
                    }
                }

                if (values.getBoolean("jumping")) {
                    HidWrapper.keyPress(KeyEvent.VK_SPACE, "space");
                    HidWrapper.delay(40);
                    HidWrapper.keyRelease(KeyEvent.VK_SPACE, "space");
                }
            }
            if (values.getInt("type") == 2) {
                if (values.getInt("fingercount") == 2) {
                    if (!this.escpressed) {
                        HidWrapper.keyPress(KeyEvent.VK_ESCAPE, "esc");
                        this.escpressed = true;
                    }
                }
                else {
                    if (this.escpressed) {
                        HidWrapper.keyRelease(KeyEvent.VK_ESCAPE, "esc");
                        this.escpressed = false;
                    }
                }

                if (values.getInt("fingercount") == 3) {
                    if (!this.epressed) {
                        HidWrapper.keyPress(KeyEvent.VK_E, "e");
                        this.epressed = true;
                    }
                }
                else {
                    if (this.epressed) {
                        HidWrapper.keyRelease(KeyEvent.VK_E, "e");
                        this.epressed = false;
                    }
                }

                if (values.getInt("fingercount") == 1) {
                    if (!this.rightpressed) {
                        HidWrapper.mousePress(InputEvent.BUTTON3_DOWN_MASK, "right");
                        this.rightpressed = true;
                    }
                }
                else {
                    if (this.rightpressed) {
                        HidWrapper.mouseRelease(InputEvent.BUTTON3_DOWN_MASK, "right");
                        this.rightpressed = false;
                    }
                }

                if (values.getInt("fingercount") == 4 || this.lastSentRightHand == 4) {
                    if (!this.rightpressed) {
                        HidWrapper.mousePress(InputEvent.BUTTON3_DOWN_MASK, "right");
                        this.rightpressed = true;
                    }
                } else {
                    if (this.rightpressed) {
                        HidWrapper.mouseRelease(InputEvent.BUTTON3_DOWN_MASK, "right");
                        this.rightpressed = false;
                    }
                }

                if (values.getInt("fingercount") != 0) {
                    this.lastSentRightHand = values.getInt("fingercount");
                }
            }

            if (values.getInt("type") == 4) {
                HidWrapper.keyPress(KeyStroke.getKeyStroke(Integer.toString(values.getInt("slot"))).getKeyCode(), Integer.toString(values.getInt("slot")));
                HidWrapper.keyRelease(KeyStroke.getKeyStroke(Integer.toString(values.getInt("slot"))).getKeyCode(), Integer.toString(values.getInt("slot")));
            }
        }
        else if (
                screen instanceof CraftingScreen ||
                screen instanceof InventoryScreen ||
                screen instanceof FurnaceScreen ||
                screen instanceof AnvilScreen ||
                screen instanceof BeaconScreen ||
                screen instanceof BlastFurnaceScreen ||
                screen instanceof BookEditScreen ||
                screen instanceof BookViewScreen ||
                screen instanceof BrewingStandScreen ||
                screen instanceof CartographyTableScreen ||
                screen instanceof CommandBlockEditScreen ||
                screen instanceof CreativeModeInventoryScreen ||
                screen instanceof DispenserScreen ||
                screen instanceof EnchantmentScreen ||
                screen instanceof GrindstoneScreen ||
                screen instanceof HopperScreen ||
                screen instanceof HorseInventoryScreen ||
                screen instanceof LoomScreen ||
                screen instanceof MerchantScreen ||
                screen instanceof MinecartCommandBlockEditScreen ||
                screen instanceof ShulkerBoxScreen ||
                screen instanceof SmithingScreen ||
                screen instanceof SmokerScreen ||
                screen instanceof StonecutterScreen ||
                screen instanceof ContainerScreen
        ) {
            // In some kind of item menu
            if (values.getInt("type") == 1) {
                HidWrapper.mouseMove(values.getInt("fingerx"), values.getInt("fingery"));
                if (values.getBoolean("pressed")) {
                    if (!this.leftpressed) {
                        HidWrapper.mousePress(InputEvent.BUTTON1_DOWN_MASK, "left");
                        this.leftpressed = true;
                    }
                } else {
                    if (this.leftpressed) {
                        HidWrapper.mouseRelease(InputEvent.BUTTON1_DOWN_MASK, "left");
                        this.leftpressed = false;
                    }
                }
            }

            if (values.getInt("type") == 2) {
                if (values.getInt("fingercount") == 2) {
                    if (!this.escpressed) {
                        HidWrapper.keyPress(KeyEvent.VK_ESCAPE, "esc");
                        this.escpressed = true;
                    }
                } else {
                    if (this.escpressed) {
                        HidWrapper.keyRelease(KeyEvent.VK_ESCAPE, "esc");
                        this.escpressed = false;
                    }
                }
            }
        }
        else {
            // Not any screen we know

            // Esc button support
            if (values.getInt("type") == 2) {
                if (values.getInt("fingercount") == 2) {
                    if (!this.escpressed) {
                        HidWrapper.keyPress(KeyEvent.VK_ESCAPE, "esc");
                        this.escpressed = true;
                    }
                }
                else {
                    if (this.escpressed) {
                        HidWrapper.keyRelease(KeyEvent.VK_ESCAPE, "esc");
                        this.escpressed = false;
                    }
                }
            }
        }
    }

    @Override
    public void onMessage( WebSocket conn, ByteBuffer message ) {}

    @Override
    public void onError(WebSocket conn, Exception ex) {}

    @Override
    public void onStart() {
        Util.log("Backend: Backend server started successfully");
    }
}
