<?php
require_once ($_SERVER['DOCUMENT_ROOT'].'/controllers/general/GeneralController.php');

class UsersController extends GeneralController {
	private $conn;

	public function __construct($conn){
        $this->conn = $conn;
    }

	/**
	 * Adiciona um novo usuário ao sistema.
	 *
	 * Esta função é responsável por adicionar um novo usuário ao sistema.
	 * Se o CPF fornecido já estiver em uso, a função retornará uma mensagem de erro.
	 * Após o cadastro bem-sucedido, o usuário também será registrado como aceitante
	 * das políticas e termos de usuário.
	 *
	 * @param string $userName O nome do usuário.
	 * @param string $userDocNoFormating O número de documento do usuário (CPF), sem formatação.
	 * @param string $userBirthTimestamp O timestamp de nascimento do usuário.
	 * @param string $userEmail O endereço de e-mail do usuário.
	 * @param string $userPassword A senha do usuário.
	 * @param string $userLegalResponsibleName O nome do responsável legal (opcional).
	 * @param string $userLegalResponsibleDocNoFormating O número de documento do responsável legal (CPF), sem formatação (opcional).
	 * @return array Um array associativo contendo o código de status e a mensagem da operação.
	 *               O código de status pode ser um dos seguintes:
	 *               - 200: OK (cadastro realizado com sucesso).
	 *               - 409: Conflito (CPF já cadastrado).
	 *               - Outros códigos de erro indicando falhas no processo.
	 */
	public function addUser($userName, $userDocNoFormating, $userBirthTimestamp, $userEmail, $userPassword, $userLegalResponsibleName, $userLegalResponsibleDocNoFormating) {
		$tableName = "users";

		$getClass = new GeneralController($this->conn);
		$getResponse_select = $getClass->selectAllDataInTable($tableName);

		if($getResponse_select['code'] === 200) { // Criar usuário padrão

			$getMessage = $getResponse_select['message'];
            if(is_array($getMessage)) {
                $userDocs = [];
                foreach ($getMessage as $user) {
                    $userDocs[] = $user['user_doc'];
                }

                if (in_array($userDocNoFormating, $userDocs)) {
                    $msg = [
						'code' => 409,
						'message' => 'Já existe um cadastro com o CPF informado!'
					];
					return $msg;
                } else {
                    $table = "users";
					$hashPassword = password_hash($userPassword, PASSWORD_DEFAULT);
					$columns = ["user_name", "user_doc", "user_email", "user_password", "user_bday", "user_legal_responsible_name", "user_legal_responsible_doc"];
					$values = ["?", "?", "?", "?", "?", "?", "?"];
					$bindTypes = "sssssss";
					$bindParams = [$userName, $userDocNoFormating, $userEmail, $hashPassword, $userBirthTimestamp, $userLegalResponsibleName, $userLegalResponsibleDocNoFormating];

					$getResponse_addUser = $getClass->insertDataInTable($table, $columns, $values, $bindTypes, $bindParams);
					if($getResponse_addUser['code'] === 200) {
						// Recupera o ID do usuário cadastrado
						$userID = $getResponse_addUser['last_inserted_id'];
						
						// Inserir aceitação de políticas de usuário
						$table = "user_policies_acceptance";
						$columns = ["policy_agree_user_id"];
						$values = ["?"];
						$bindTypes = "i";
						$bindParams = [$userID];
						$getResponse_agree_policies = $getClass->insertDataInTable($table, $columns, $values, $bindTypes, $bindParams);

						// Inserir aceitação de termos de usuário
						$table = "user_terms_acceptance";
						$columns = ["term_agree_user_id"];
						$values = ["?"];
						$bindTypes = "i";
						$bindParams = [$userID];
						$getResponse_agree_terms = $getClass->insertDataInTable($table, $columns, $values, $bindTypes, $bindParams);

						if($getResponse_agree_policies['code'] === 200) {
							if($getResponse_agree_terms['code'] === 200) {
								$msg = [
									'code' => 200,
									'message' => 'Cadastro realizado com sucesso!'
								];
								return $msg;
							} else {
								return $getResponse_agree_terms;
							}
						} else {
							return $getResponse_agree_policies;
						}
					} else {
						return $getResponse_addUser;
					}
                }
            }
		} else { // Criar usuário administrativo
			$table = "users";
			$user_level = 255;
			$hashPassword = password_hash($userPassword, PASSWORD_DEFAULT);
			$columns = ["user_name", "user_doc", "user_email", "user_password", "user_bday", "user_legal_responsible_name", "user_legal_responsible_doc", "user_level"];
			$values = ["?", "?", "?", "?", "?", "?", "?", "?"];
			$bindTypes = "sssssssi";
			$bindParams = [$userName, $userDocNoFormating, $userEmail, $hashPassword, $userBirthTimestamp, $userLegalResponsibleName, $userLegalResponsibleDocNoFormating, $user_level];

			$getResponse_addUser = $getClass->insertDataInTable($table, $columns, $values, $bindTypes, $bindParams);
			if($getResponse_addUser['code'] === 200) {
				// Recupera o ID do usuário cadastrado
				$userID = $getResponse_addUser['last_inserted_id'];
				
				// Inserir aceitação de políticas de usuário
				$table = "user_policies_acceptance";
				$columns = ["policy_agree_user_id"];
				$values = ["?"];
				$bindTypes = "i";
				$bindParams = [$userID];
				$getResponse_agree_policies = $getClass->insertDataInTable($table, $columns, $values, $bindTypes, $bindParams);

				// Inserir aceitação de termos de usuário
				$table = "user_terms_acceptance";
				$columns = ["term_agree_user_id"];
				$values = ["?"];
				$bindTypes = "i";
				$bindParams = [$userID];
				$getResponse_agree_terms = $getClass->insertDataInTable($table, $columns, $values, $bindTypes, $bindParams);

				if($getResponse_agree_policies['code'] === 200 && $getResponse_agree_terms['code'] === 200) {
					$msg = [
						'code' => 200,
						'message' => 'Cadastro realizado com sucesso!'
					];
					return $msg;
				} else {
					return $getResponse_agree_terms;
				}
			} else {
				return $getResponse_addUser;
			}

		}

	}


}

?>