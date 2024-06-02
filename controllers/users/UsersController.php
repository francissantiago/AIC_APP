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
	 * @var $conn A conexão com o banco de dados herdada da classe GeneralController.
	 */
	private $conn;

	/**
	 * Construtor da classe.
	 *
	 * Este construtor recebe uma conexão com o banco de dados e a armazena na propriedade da classe.
	 *
	 * @param $conn Uma instância representando a conexão com o banco de dados.
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

	/**
	 * Realiza o login do usuário com base no documento e senha fornecidos.
	 * 
	 * @param string $usrDoc O documento do usuário.
	 * @param string $usrPass A senha do usuário.
	 * @return array Um array associativo contendo o código de status e uma mensagem correspondente.
	 */
	public function loginUsr($usrDoc, $usrPass)
	{
		require_once ($_SERVER['DOCUMENT_ROOT'] . '/settings/vars.php');
		require_once ($_SERVER['DOCUMENT_ROOT'] . '/controllers/general/MailerController.php');
		$sendMail = new MailerController($mailHost, $mailUsername, $mailPassword, $mailSMTPSecure, $mailPort, $mailFrom, $mail_FromName);
		$getClass = new GeneralController($this->conn);

		/**
		 * 01 - Recuperação de dados do usuário
		 */
		// Recupera ID de usuário conforme busca no banco de dados
		$getUsrID = $this->getUserID($usrDoc, $getClass);
		// Verifica se a chave 'code' existe e se o código de retorno não é 200
		if (!isset($getUsrID['code']) || $getUsrID['code'] !== 200) {
			return ['code' => 404, 'message' => 'Dados de autenticação inválidos!'];
		}

		$usrID = $getUsrID['userID'];

		/**
		 * 02 - Validação de autenticação do usuário
		 */
		$validatePassword = $this->validatePassword($usrDoc, $usrPass, $getClass);
		// Verifica se a chave 'code' existe e se o código de retorno não é 401
		if (!isset($validatePassword['code']) || $validatePassword['code'] === 401) {
			return ['code' => 401, 'message' => 'Dados de autenticação inválidos!'];
		}

		/**
		 * 03 - Recuperação de dados de e-mail e nome do usuário
		 */
		$getUsrEmailAndName = $this->getUserEmailandName($usrID, $getClass);
		// Verifica se a chave 'code' existe e se o código de retorno não é 200
		if (!isset($getUsrEmailAndName['code']) || $getUsrEmailAndName['code'] !== 200) {
			return ['code' => 404, 'message' => 'Dados de usuário não encontrado em nosso banco de dados!'];
		}

		// Verifica se a chave 'nome' existe
		if (empty($getUsrEmailAndName['usrName'])) {
			return ['code' => 404, 'message' => 'Nome de usuário não encontrado em nosso banco de dados!'];
		}

		// Verifica se a chave 'email' existe
		if (empty($getUsrEmailAndName['usrEmail'])) {
			return ['code' => 404, 'message' => 'E-mail de usuário não encontrado em nosso banco de dados!'];
		}

		$usrEmail = $getUsrEmailAndName['usrEmail'];
		$usrName = $getUsrEmailAndName['usrName'];

		/**
		 * 04 - Validação da confirmação de e-mail através de token de autenticação de registro
		 */
		// Checar se usuário verificou o e-mail
		$getUsrEmailCheck = $this->checkUserRegistrationTokenVerification($usrID, $getClass);
		// Verifica se a chave 'code' existe
		if (!isset($getUsrEmailCheck['code'])) {
			return ['code' => 404, 'message' => 'Informações do token de registro não disponíveis!'];
		}

		// Verifica se o código de retorno é 303
		if ($getUsrEmailCheck['code'] === 303) {
			$getNewToken = $this->registerNewToken($usrID, $getClass);
			// Verifica se a chave 'code' existe e se o código de retorno não é 200
			if (!isset($getNewToken['code']) || $getNewToken['code'] === 204) {
				return ['code' => 404, 'message' => 'Não foi possível criar um novo token!'];
			}

			$newToken = $getNewToken['token'];
			$sendNewToken = $this->sendRegisterTokenToEmail($sendMail, $usrID, $usrEmail, $usrName, $newToken, $siteName, $siteUrl, $siteEmail, $mailFrom, $getClass);

			return $sendNewToken;
		}

		// Verifica se o código de retorno é 401
		if ($getUsrEmailCheck['code'] === 401) {
			return ['code' => 404, 'message' => 'Por favor, confirme seu e-mail!'];
		}

		// Verifica se o código de retorno é 401
		if ($getUsrEmailCheck['code'] === 404) {
			return ['code' => 404, 'message' => 'Token encontrado não é de registro!'];
		}

		/**
		 * 05 - Usuário conectado com sucesso
		 */
		// Verifica o status atual da sessão
		if (session_status() === PHP_SESSION_NONE) {
			// Inicia a sessão se não estiver ativa
			session_start();
		}
		$_SESSION['session_user_id'] = $usrID;
		$_SESSION['session_user_doc'] = $usrDoc;
		$_SESSION['session_user_name'] = $usrName;
		$_SESSION['session_user_email'] = $usrEmail;

		return ['code' => 200, 'message' => 'Usuário autenticado com sucesso! Redirecionando para o painel.'];
	}

	/**
	 * Obtém o ID do usuário com base no documento fornecido.
	 * 
	 * @param string $userDoc O documento do usuário.
	 * @param object $getClass A instância da classe que contém o método para selecionar dados da tabela.
	 * @return array Um array associativo contendo o código de status e o ID do usuário.
	 */
	public function getUserID($userDoc, $getClass)
	{
		$response = [];
		$tableName = "users";
		$whereColumn = "user_doc";
		$whereValue = $userDoc;
		$whereValueType = "s";

		$callMethod = $getClass->selectAllDataInTable($tableName, $whereColumn, $whereValue, $whereValueType);

		if ($callMethod['code'] === 200) {
			$response = ['code' => 200, 'userID' => $callMethod['message'][0]['user_id']];
		} else {
			$response = $callMethod;
		}
		return $response;
	}

	/**
	 * Valida a senha do usuário com base no documento fornecido.
	 * 
	 * @param string $usrDoc O documento do usuário.
	 * @param string $usrPass A senha do usuário.
	 * @param object $getClass A instância da classe que contém o método para selecionar dados da tabela.
	 * @return array Um array associativo contendo o código de status e a mensagem de autenticação.
	 */
	public function validatePassword($usrDoc, $usrPass, $getClass)
	{
		$response = [];
		$tableName = "users";
		$whereColumn = "user_doc";
		$whereValue = $usrDoc;
		$whereValueType = "s";

		$callMethod = $getClass->selectAllDataInTable($tableName, $whereColumn, $whereValue, $whereValueType);

		if ($callMethod['code'] === 200) {
			$passwordDB = $callMethod['message'][0]['user_password'];
			if (password_verify($usrPass, $passwordDB)) {
				$response = ['code' => 200, 'message' => 'Usuário autenticado!'];
			} else {
				$response = ['code' => 401, 'message' => 'Não foi possível autenticar o usuário com os dados fornecidos!'];
			}
		} else {
			$response = $callMethod;
		}
		return $response;
	}

	/**
	 * Verifica o token de registro do usuário para validação.
	 * 
	 * @param int $userID O ID do usuário.
	 * @param object $getClass A instância da classe que contém o método para selecionar dados da tabela.
	 * @return array Um array associativo contendo o código de status e a mensagem de validação do token.
	 */
	public function checkUserRegistrationTokenVerification($userID, $getClass)
	{
		$response = [];
		$tableName = "user_temp_tokens";
		$whereColumn = "user_temp_token_user_id";
		$whereValue = $userID;
		$whereValueType = "i";

		$callMethod = $getClass->selectAllDataInTable($tableName, $whereColumn, $whereValue, $whereValueType);

		if ($callMethod['code'] === 200) {
			if ($callMethod['message'][0]['user_temp_token_validated'] === 1) {
				return ['code' => 200, 'message' => 'Código validado!'];
			}

			if ($callMethod['message'][0]['user_temp_token_type'] !== 1) {
				return ['code' => 404, 'message' => 'Tipo de código de autenticação diferente do token de registro!'];
			}

			$currentTime = new DateTime(date('Y-m-d H:i:s'));
			$timeInDB = new DateTime($callMethod['message'][0]['user_temp_token_expiration']);
			$checkDiffTime = $currentTime->diff($timeInDB);

			// Verificar se a diferença é maior ou igual a 48 horas
			if ($checkDiffTime->days >= 2 || ($checkDiffTime->days == 1 && $checkDiffTime->h >= 24)) {
				$response = ['code' => 303, 'message' => "Seu token expirou!"];
			} else {
				$response = ['code' => 401, 'message' => 'E-mail não confirmado! Favor confirmar!'];
			}
		} else {
			$response = $callMethod;
		}
		return $response;
	}

	/**
	 * Recupera o e-mail e o nome do usuário.
	 * 
	 * @param int $usrID O ID do usuário.
	 * @param object $getClass A instância da classe que contém o método para selecionar dados da tabela.
	 * @return array Um array associativo contendo o código de status, e-mail e nome do usuário.
	 */
	public function getUserEmailandName($usrID, $getClass)
	{
		$response = [];
		$tableName = "users";
		$whereColumn = "user_id";
		$whereValue = $usrID;
		$whereValueType = "i";

		$callMethod = $getClass->selectAllDataInTable($tableName, $whereColumn, $whereValue, $whereValueType);
		if ($callMethod['code'] === 200) {
			$response = [
				'code' => 200,
				'usrEmail' => $callMethod['message'][0]['user_email'],
				'usrName' => $callMethod['message'][0]['user_name']
			];
		} else {
			$response = $callMethod;
		}

		return $response;
	}

	/**
	 * Registra um novo token de autenticação para o usuário.
	 * 
	 * @param int $usrID O ID do usuário.
	 * @param object $getClass A instância da classe que contém os métodos para gerar token e atualizar dados.
	 * @return array Um array associativo contendo o código de status e o novo token, ou a resposta de erro.
	 */
	public function registerNewToken($usrID, $getClass)
	{
		$token = $getClass->genToken(4);
		$currentTime = date('Y-m-d H:i:s');
		$futureTimestampMySQL = date('Y-m-d H:i:s', strtotime('+48 hours', strtotime($currentTime)));
		$token_type = 1;

		$updateTable = "user_temp_tokens";
		$updateColumns = ["user_temp_token_code", "user_temp_token_expiration"];
		$updateWhereColumns = ["user_temp_token_user_id", "user_temp_token_type"];
		$updateBindTypes = "ssii";
		$updateBindParams = [$token, $futureTimestampMySQL, $usrID, $token_type];

		$callMethod = $getClass->updateDataWithMultipleParams($updateTable, $updateColumns, $updateWhereColumns, $updateBindTypes, $updateBindParams);
		if ($callMethod['code'] === 200) {
			return ['code' => 200, 'token' => $token];
		}

		return $callMethod;
	}

	/**
	 * Envia um token de registro para o e-mail do usuário.
	 * 
	 * @param object $sendMail A instância da classe MailerController.
	 * @param int $usrID O ID do usuário.
	 * @param string $usrEmail O e-mail do usuário.
	 * @param string $usrName O nome do usuário.
	 * @param string $newToken O novo token de registro.
	 * @param string $siteName O nome do site.
	 * @param string $siteUrl A URL do site.
	 * @param string $siteEmail O e-mail de contato do site.
	 * @param string $mailFrom O endereço de e-mail de origem.
	 * @param object $getClass A instância da classe que contém os métodos necessários.
	 * @return array Um array associativo contendo o código de status e a mensagem de sucesso ou erro.
	 */
	public function sendRegisterTokenToEmail($sendMail, $usrID, $usrEmail, $usrName, $newToken, $siteName, $siteUrl, $siteEmail, $mailFrom, $getClass)
	{
		try {
			$templateHTML = file_get_contents($_SERVER['DOCUMENT_ROOT'] . '/mail_template/resend_register_token.php');
			$replacedHTML = str_replace(['PHP_SITE_NAME', 'PHP_USERNAME', 'PHP_SITE_URL', 'PHP_SITE_EMAIL', 'PHP_USERID', 'PHP_TOKEN'], [$siteName, $usrName, $siteUrl, $siteEmail, $usrID, $newToken], $templateHTML);

			$message = $sendMail->sendEmail(
				$mailFrom,
				$siteName,
				$usrEmail,
				$usrName,
				'[AIC] Token de Registro',
				$replacedHTML,
				'Graça e paz de Cristo, ' . $usrName . '! Obrigado por usar nossa plataforma!'
			);

			if ($message['code'] === 200) {
				return [
					'code' => 203,
					'message' => 'Token enviado com sucesso!<br> Por favor confirme seu cadastro no e-mail.'
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