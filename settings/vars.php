<?php
require_once ($_SERVER['DOCUMENT_ROOT'] . '/vendor/autoload.php');

use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable($_SERVER['DOCUMENT_ROOT']);
$dotenv->safeLoad();

/*
 * Variáveis de ambiente
 */
$siteName = 'AIC - Administração de Igrejas Cristãs';
$siteUrl = 'http://127.0.0.18';
$siteEmail = 'francissantiago@lightburden.net';

/**
 * Variáveis de E-mail
 */
$mailHost = $_ENV['MAIL_HOST'];
$mailUsername = $_ENV['MAIL_USERNAME'];
$mailPassword = $_ENV['MAIL_PASSWORD'];
$mailSMTPSecure = 'tls';
$mailPort = 587;
$mailFrom = 'noreply@lightburden.net';
$mail_FromName = 'No-Reply';
?>