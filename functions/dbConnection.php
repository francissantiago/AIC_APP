<?php
/*
* Configurações do banco de dados
*/
function dbConnection(){
	$app_env = 'local';
	if($app_env == 'production'){
		$dbhost = 'IP_PRODUCTION';
		$dbport = 3306;
		$dbuser = 'USER_DB_PRODUCTION';
		$dbpass = 'PASS_DB_PRODUCTION';
		$dbdatabase = 'db_aic';
	} elseif($app_env == 'local') {
		$dbhost = 'localhost';
		$dbport = 3306;
		$dbuser = 'root';
		$dbpass = '';
		$dbdatabase = 'db_aic';
	}
	
	$connect = new mysqli($dbhost, $dbuser, $dbpass, $dbdatabase, $dbport);

	if($connect->connect_error){
		die('Error: No database connection!');
	} else {
		mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
		$connect->set_charset("latin1");
		return $connect;
	}
}

var_dump(dbConnection());
?>