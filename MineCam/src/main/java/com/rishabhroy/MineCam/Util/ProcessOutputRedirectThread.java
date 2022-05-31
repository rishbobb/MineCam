package com.rishabhroy.MineCam.Util;

import org.apache.logging.log4j.LogManager;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;

// Util for redirecting process to output
public class ProcessOutputRedirectThread extends Thread {
    InputStream is;

    // reads everything from is until empty.
    public ProcessOutputRedirectThread(InputStream is) {
        this.is = is;
    }

    public void run() {
        try {
            InputStreamReader isr = new InputStreamReader(is);
            BufferedReader br = new BufferedReader(isr);
            String line=null;
            while ( (line = br.readLine()) != null) {
//                LogManager.getLogger().info(line);
            }
        } catch (IOException ioe) {
            ioe.printStackTrace();
        }
    }
}
