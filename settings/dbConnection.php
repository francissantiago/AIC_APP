<?php
require ($_SERVER['DOCUMENT_ROOT'] . '/vendor/autoload.php');

use Dotenv\Dotenv;

$dotenv = Dotenv::createImmutable($_SERVER['DOCUMENT_ROOT']);
$dotenv->safeLoad();

/*
 * Configurações do banco de dados
 */
function dbConnection()
{
	// Definindo o fuso horário a partir da variável de ambiente
	$app_timezone = $_ENV['APP_TIMEZONE'];
	date_default_timezone_set($app_timezone);

	// Obtendo o ambiente da aplicação
	$app_env = $_ENV['APP_ENV'];

	// Configurações de banco de dados para produção
	if ($app_env == 'production') {
		$dbhost = $_ENV['ENV_DB_PROD_HOST'];
		$dbport = $_ENV['ENV_DB_PROD_PORT'];
		$dbuser = $_ENV['ENV_DB_PROD_USER'];
		$dbpass = $_ENV['ENV_DB_PROD_PASS'];
		$dbdatabase = $_ENV['ENV_DB_PROD_NAME'];
	}
	// Configurações de banco de dados para desenvolvimento
	elseif ($app_env == 'development') {
		$dbhost = $_ENV['ENV_DB_DEV_HOST'];
		$dbport = $_ENV['ENV_DB_DEV_PORT'];
		$dbuser = $_ENV['ENV_DB_DEV_USER'];
		$dbpass = $_ENV['ENV_DB_DEV_PASS'];
		$dbdatabase = $_ENV['ENV_DB_DEV_NAME'];
	} else {
		// Caso o ambiente não seja especificado corretamente
		die('Error: Environment not set or incorrect!');
	}

	// Criando a conexão com o banco de dados
	$connect = new mysqli($dbhost, $dbuser, $dbpass, $dbdatabase, $dbport);

	// Verificando se houve erro na conexão
	if ($connect->connect_error) {
		die('Error: No database connection!');
	}

	// Configurando o relatório de erros do MySQLi
	mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

	// Definindo o charset da conexão
	$connect->set_charset("utf8mb4");

	return $connect;
}
?>