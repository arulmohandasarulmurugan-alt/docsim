package com.apple;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class AppleApplication {

    public static void main(String[] args) {
        SpringApplication.run(AppleApplication.class, args);
    }

    @Bean
    public CommandLineRunner commandLineRunner() {
        return args -> {
            System.out.println("🚀 DocSim Backend Started Successfully!");
            System.out.println("🌍 Ready to process document similarity requests.");
        };
    }
}
