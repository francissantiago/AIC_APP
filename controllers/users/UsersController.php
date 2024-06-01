<?php
/**
 * Inclui a classe GeneralController necessária para o funcionamento desta classe.
 */
require_once ($_SERVER['DOCUMENT_ROOT'] . '/controllers/general/GeneralController.php');

class UsersController extends GeneralController
{
	/**
	 * Conexão com o banco de dados.
	 *
	 * @var PDO $conn A conexão com o banco de dados herdada da classe GeneralController.
	 */
	private $conn;

	/**
	 * Construtor da classe.
	 *
	 * Este construtor recebe uma conexão com o banco de dados e a armazena na propriedade da classe.
	 *
	 * @param PDO $conn Uma instância de PDO representando a conexão com o banco de dados.
	 */
	public function __construct($conn)
	{
		$this->conn = $conn;
	}

	/**
	 * Adiciona um novo usuário ao sistema.
	 *
	 * Esta função realiza o cadastro de um novo usuário no sistema. Ela verifica se o CPF informado já está cadastrado, cria o usuário no banco de dados, registra a aceitação de políticas e termos, e envia um email de confirmação de cadastro.
	 *
	 * @param string $userName Nome do usuário.
	 * @param string $userDocNoFormating CPF do usuário sem formatação.
	 * @param int $userBirthTimestamp Timestamp de nascimento do usuário (formato Unix).
	 * @param string $userEmail Email do usuário.
	 * @param string $userPassword Senha do usuário (armazenada com hash criptográfico).
	 * @param string $userLegalResponsibleName Nome do responsável legal (se aplicável).
	 * @param string $userLegalResponsibleDocNoFormating CPF do responsável legal sem formatação (se aplicável).
	 * @return array Retorna um array contendo o código e a mensagem de status da operação.
	 *  - código (int): Código HTTP indicando o resultado da operação.
	 *    - 200: Operação realizada com sucesso.
	 *    - 409: Conflito - CPF já cadastrado.
	 *    - 500: Erro interno ao processar a solicitação.
	 *  - message (string): Mensagem de status descrevendo o resultado da operação.
	 *
	 * @throws Exception Dispara uma exceção caso ocorra um erro inesperado durante o processo de cadastro.
	 */
	public function addUser($userName, $userDocNoFormating, $userBirthTimestamp, $userEmail, $userPassword, $userLegalResponsibleName, $userLegalResponsibleDocNoFormating)
	{
		require_once ($_SERVER['DOCUMENT_ROOT'] . '/settings/vars.php');
		require_once ($_SERVER['DOCUMENT_ROOT'] . '/controllers/general/MailerController.php');
		$sendMail = new MailerController($mailHost, $mailUsername, $mailPassword, $mailSMTPSecure, $mailPort, $mailFrom, $mail_FromName);
		$getClass = new GeneralController($this->conn);

		// Verifica se o CPF já está cadastrado
		if ($this->isUserDocRegistered($userDocNoFormating, $getClass)) {
			return [
				'code' => 409,
				'message' => 'Já existe um cadastro com o CPF informado!'
			];
		}

		// Cria usuário
		$userLevel = 1; // Default user level
		$response = $this->createUser($userName, $userDocNoFormating, $userBirthTimestamp, $userEmail, $userPassword, $userLegalResponsibleName, $userLegalResponsibleDocNoFormating, $userLevel, $getClass);

		if ($response['code'] !== 200) {
			return $response;
		}

		$userID = $response['last_inserted_id'];

		// Aceitação de políticas e termos
		if (!$this->acceptPoliciesAndTerms($userID, $getClass)) {
			return [
				'code' => 500,
				'message' => 'Erro ao aceitar políticas e termos.'
			];
		}

		// Gera e envia token de confirmação de cadastro
		return $this->sendConfirmationEmail($userID, $userName, $userEmail, $userDocNoFormating, $userPassword, $sendMail, $getClass, $siteName, $siteUrl, $siteEmail, $mailFrom);
	}

	/**
	 * Verifica se o CPF informado já está cadastrado no sistema.
	 *
	 * Esta função verifica se o CPF (documento do usuário sem formatação) informado já existe em um registro na tabela "users" do banco de dados.
	 *
	 * @param string $userDocNoFormating CPF do usuário sem formatação.
	 * @param GeneralController $getClass Uma instância da classe GeneralController utilizada para acessar o banco de dados.
	 * @return bool Retorna `true` se o CPF informado já estiver cadastrado, `false` caso contrário.
	 *
	 * @throws Exception Dispara uma exceção caso ocorra um erro ao consultar o banco de dados.
	 */
	private function isUserDocRegistered($userDocNoFormating, $getClass)
	{
		$response = $getClass->selectAllDataInTable("users");
		if ($response['code'] === 200) {
			foreach ($response['message'] as $user) {
				if ($user['user_doc'] === $userDocNoFormating) {
					return true;
				}
			}
		}
		return false;
	}

	/**
	 * Cria um novo usuário no banco de dados.
	 *
	 * Esta função insere um novo registro na tabela "users" do banco de dados, contendo as informações do usuário. A senha do usuário é armazenada com hash criptográfico utilizando a função `password_hash`.
	 *
	 * @param string $userName Nome do usuário.
	 * @param string $userDocNoFormating CPF do usuário sem formatação.
	 * @param int $userBirthTimestamp Timestamp de nascimento do usuário (formato Unix).
	 * @param string $userEmail Email do usuário.
	 * @param string $userPassword Senha do usuário (texto original).
	 * @param string $userLegalResponsibleName Nome do responsável legal (se aplicável).
	 * @param string $userLegalResponsibleDocNoFormating CPF do responsável legal sem formatação (se aplicável).
	 * @param int $userLevel Nível de acesso do usuário (definido pelo administrador).
	 * @param GeneralController $getClass Uma instância da classe GeneralController utilizada para acessar o banco de dados.
	 * @return array Retorna um array contendo o código e a mensagem de status da operação de inserção.
	 *  - código (int): Código HTTP indicando o resultado da operação.
	 *    - 200: Operação realizada com sucesso (incluindo o ID do registro inserido).
	 *    - 500: Erro interno ao processar a solicitação.
	 *  - message (mixed): 
	 *    - string contendo o ID do registro inserido (se a operação for bem-sucedida).
	 *    - array contendo informações de erro (se a operação falhar).
	 *
	 * @throws Exception Dispara uma exceção caso ocorra um erro inesperado durante a inserção do registro.
	 */
	private function createUser($userName, $userDocNoFormating, $userBirthTimestamp, $userEmail, $userPassword, $userLegalResponsibleName, $userLegalResponsibleDocNoFormating, $userLevel, $getClass)
	{
		$table = "users";
		$hashPassword = password_hash($userPassword, PASSWORD_DEFAULT);
		$columns = ["user_name", "user_doc", "user_email", "user_password", "user_bday", "user_legal_responsible_name", "user_legal_responsible_doc", "user_level"];
		$values = ["?", "?", "?", "?", "?", "?", "?", "?"];
		$bindTypes = "sssssssi";
		$bindParams = [$userName, $userDocNoFormating, $userEmail, $hashPassword, $userBirthTimestamp, $userLegalResponsibleName, $userLegalResponsibleDocNoFormating, $userLevel];

		return $getClass->insertDataInTable($table, $columns, $values, $bindTypes, $bindParams);
	}

	/**
	 * Registra a aceitação de políticas e termos pelo usuário.
	 *
	 * Esta função registra a aceitação de políticas e termos pelo usuário, inserindo registros nas tabelas "user_policies_acceptance" e "user_terms_acceptance" do banco de dados.
	 *
	 * @param int $userID Identificador único do usuário.
	 * @param GeneralController $getClass Uma instância da classe GeneralController utilizada para acessar o banco de dados.
	 * @return bool Retorna `true` se a aceitação de políticas e termos for registrada com sucesso, `false` caso contrário.
	 *
	 * @throws Exception Dispara uma exceção caso ocorra um erro inesperado durante a inserção dos registros.
	 */
	private function acceptPoliciesAndTerms($userID, $getClass)
	{
		$tables = ["user_policies_acceptance" => "policy_agree_user_id", "user_terms_acceptance" => "term_agree_user_id"];
		foreach ($tables as $table => $column) {
			$columns = [$column];
			$values = ["?"];
			$bindTypes = "i";
			$bindParams = [$userID];
			$response = $getClass->insertDataInTable($table, $columns, $values, $bindTypes, $bindParams);
			if ($response['code'] !== 200) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Envia um email de confirmação de cadastro para o usuário.
	 *
	 * Esta função gera um token de confirmação, registra-o no banco de dados e envia um email de confirmação para o usuário contendo o link de ativação e credenciais de login.
	 *
	 * @param int $userID Identificador único do usuário.
	 * @param string $userName Nome do usuário.
	 * @param string $userEmail Email do usuário.
	 * @param string $userDocNoFormating CPF do usuário sem formatação.
	 * @param string $userPassword Senha do usuário (armazenada com hash criptográfico).
	 * @param MailerController $sendMail Uma instância da classe MailerController utilizada para enviar emails.
	 * @param GeneralController $getClass Uma instância da classe GeneralController utilizada para acessar o banco de dados.
	 * @return array Retorna um array contendo o código e a mensagem de status da operação.
	 *  - código (int): Código HTTP indicando o resultado da operação.
	 *    - 200: Operação realizada com sucesso.
	 *    - 404: Erro ao tentar enviar o email de confirmação.
	 *  - message (string): Mensagem de status descrevendo o resultado da operação.
	 *
	 * @throws Exception Dispara uma exceção caso ocorra um erro inesperado durante o processo.
	 */
	private function sendConfirmationEmail($userID, $userName, $userEmail, $userDocNoFormating, $userPassword, $sendMail, $getClass, $siteName, $siteUrl, $siteEmail, $mailFrom)
	{
		$controller = new GeneralController();
		$token = $controller->genToken(4);
		$currentTime = date('Y-m-d H:i:s');
		$futureTimestampMySQL = date('Y-m-d H:i:s', strtotime('+48 hours', strtotime($currentTime)));

		// Registra o token no banco de dados
		$table = "user_temp_tokens";
		$columns = ["user_temp_token_user_id", "user_temp_token_code", "user_temp_token_type", "user_temp_token_expiration"];
		$values = ["?", "?", "?", "?"];
		$bindTypes = "isis";
		$bindParams = [$userID, $token, 1, $futureTimestampMySQL];
		$response = $getClass->insertDataInTable($table, $columns, $values, $bindTypes, $bindParams);

		if ($response['code'] !== 200) {
			return $response;
		}

		try {
			$templateHTML = file_get_contents($_SERVER['DOCUMENT_ROOT'] . '/mail_template/confirm_register.php');
			$replacedHTML = str_replace(['PHP_SITE_NAME', 'PHP_USERNAME', 'PHP_SITE_URL', 'PHP_SITE_EMAIL', 'PHP_USERLOGIN', 'PHP_USERPASS', 'PHP_TOKEN', 'PHP_USERID'], [$siteName, $userName, $siteUrl, $siteEmail, $userDocNoFormating, $userPassword, $token, $userID], $templateHTML);

			$message = $sendMail->sendEmail(
				$mailFrom,
				$siteName,
				$userEmail,
				$userName,
				'[AIC] Cadastro realizado com sucesso!',
				$replacedHTML,
				'Graça e paz de Cristo, ' . $userName . '! Obrigado por se cadastrar em nossa plataforma!'
			);

			if ($message['code'] === 200) {
				return [
					'code' => 200,
					'message' => 'Cadastro realizado com sucesso!<br> Por favor confirme seu cadastro no e-mail.'
				];
			} else {
				return [
					'code' => 404,
					'message' => 'Houve um erro ao tentar enviar o e-mail de confirmação.<br> Tente realizar login para reenviar o e-mail de confirmação.',
					'log' => $message
				];
			}
		} catch (Exception $e) {
			return [
				'code' => 404,
				'message' => 'Houve um erro ao tentar enviar o e-mail de confirmação.<br> Por favor, entre em contato com o suporte.',
				'log' => $e
			];
		}
	}
}

?>