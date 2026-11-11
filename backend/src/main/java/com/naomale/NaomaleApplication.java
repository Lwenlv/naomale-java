package com.naomale;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@org.mybatis.spring.annotation.MapperScan("com.naomale.mapper")
public class NaomaleApplication {
    public static void main(String[] args) {
        SpringApplication.run(NaomaleApplication.class, args);
    }
}
