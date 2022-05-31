package com.rishabhroy;

import io.javalin.Javalin;
import io.javalin.http.staticfiles.Location;

public class App 
{
    public static void main( String[] args )
    {
        Javalin app = Javalin.create(config -> {
                config.addStaticFiles(args[0], Location.EXTERNAL);
            }).start(5500);
    }
}
