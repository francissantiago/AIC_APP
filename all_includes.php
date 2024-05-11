<?php
if ($_SERVER['REQUEST_METHOD'] == 'GET' && realpath(__FILE__) == realpath($_SERVER['SCRIPT_FILENAME'])) {
	header('HTTP/1.0 404 Forbidden', TRUE, 404);
	die(header('location: /dashboard'));
}

/*
* Cabeçalhos
*/
$path = $_SERVER['DOCUMENT_ROOT'];
date_default_timezone_set('America/Sao_Paulo');
error_reporting(E_ERROR | E_PARSE | E_ALL);

require_once($path.'/settings/dbConnection.php');
$conn =  dbConnection();
require_once($path.'/settings/vars.php');

if (isset($_SESSION['session_userLogin'])) {
	$userSessionId = $_SESSION['session_userLogin'];
}
?>