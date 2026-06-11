package org.vaidik.appointment.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.*;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

//    @Value("${app.upload.dir:uploads/photos}")
//    private String uploadDir;
//
//    @Override
//    public void addResourceHandlers(ResourceHandlerRegistry registry) {
//        registry.addResourceHandler("/uploads/photos/**")
//                .addResourceLocations("file:" + uploadDir + "/");
//    }
}