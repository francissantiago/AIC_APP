<?php
require ($_SERVER['DOCUMENT_ROOT'] . '/vendor/autoload.php');

use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable($_SERVER['DOCUMENT_ROOT']);
$dotenv->safeLoad();

/*
* Configurações do banco de dados
*/
function dbConnection(){
	$app_env = $_ENV['APP_ENV'];
	if($app_env == 'production'){
		$dbhost = $_ENV['ENV_DB_PROD_HOST'];
		$dbport = $_ENV['ENV_DB_PROD_PORT'];
		$dbuser = $_ENV['ENV_DB_PROD_USER'];
		$dbpass = $_ENV['ENV_DB_PROD_PASS'];
		$dbdatabase = $_ENV['ENV_DB_PROD_NAME'];
	} elseif($app_env == 'development') {
		$dbhost = $_ENV['ENV_DB_DEV_HOST'];
		$dbport = $_ENV['ENV_DB_DEV_PORT'];
		$dbuser = $_ENV['ENV_DB_DEV_USER'];
		$dbpass = $_ENV['ENV_DB_DEV_PASS'];
		$dbdatabase = $_ENV['ENV_DB_DEV_NAME'];
	}
	
	$connect = new mysqli($dbhost, $dbuser, $dbpass, $dbdatabase, $dbport);

	if($connect->connect_error){
		die('Error: No database connection!');
	} else {
		mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
		$connect->set_charset("utf8mb4");
		return $connect;
	}
}
?>