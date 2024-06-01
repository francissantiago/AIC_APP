<?php
require_once ($_SERVER['DOCUMENT_ROOT'] . '/controllers/general/GeneralController.php');

class PoliciesController extends GeneralController
{
	private $conn;

	public function __construct($conn)
	{
		$this->conn = $conn;
	}

	/**
	 * Obtém todas as políticas de usuário do banco de dados.
	 *
	 * Esta função executa uma consulta SQL para recuperar todas as políticas de usuário
	 * armazenadas na tabela "user_policies" do banco de dados.
	 *
	 * @return array Um array associativo contendo o código de status e a mensagem da operação.
	 *               O código de status pode ser um dos seguintes:
	 *               - 200: OK (consulta bem-sucedida).
	 *               - 404: Não encontrado (nenhum dado corresponde à consulta).
	 *               - 412: Pré-condição falhou (erro ao preparar a consulta).
	 *               - 500: Erro interno do servidor (erro ao executar a consulta).
	 */
	public function get_userPolicies()
	{
		$tableName = "user_policies";

		$getClass = new GeneralController($this->conn);
		$getResponse = $getClass->selectAllDataInTable($tableName);

		return $getResponse;
	}

	/**
	 * Obtém todas os termos de usuário do banco de dados.
	 *
	 * Esta função executa uma consulta SQL para recuperar todos os termos de usuário
	 * armazenados na tabela "user_terms" do banco de dados.
	 *
	 * @return array Um array associativo contendo o código de status e a mensagem da operação.
	 *               O código de status pode ser um dos seguintes:
	 *               - 200: OK (consulta bem-sucedida).
	 *               - 404: Não encontrado (nenhum dado corresponde à consulta).
	 *               - 412: Pré-condição falhou (erro ao preparar a consulta).
	 *               - 500: Erro interno do servidor (erro ao executar a consulta).
	 */
	public function get_userTerms()
	{
		$tableName = "user_terms";

		$getClass = new GeneralController($this->conn);
		$getResponse = $getClass->selectAllDataInTable($tableName);

		return $getResponse;
	}
}

?>