package org.vaidik.appointment.service;

public interface EmailTransport {

    void send(String to, String subject, String html) throws Exception;
}