<?php
require_once ($_SERVER['DOCUMENT_ROOT'].'/controllers/general/GeneralController.php');

class PoliciesController extends GeneralController {
	private $conn;

	public function __construct($conn){
        $this->conn = $conn;
    }

	/* Recuperaçãos dos dados da tabela `user_policies` */
	public function get_userPolicies() {
		$tableName = "user_policies";

		$getClass = new GeneralController($this->conn);
		$getResponse = $getClass->selectAllDataInTable($tableName);
		
		return $getResponse;
	}

	/* Recuperaçãos dos dados da tabela `user_terms` */
	public function get_userTerms() {
		$tableName = "user_terms";

		$getClass = new GeneralController($this->conn);
		$getResponse = $getClass->selectAllDataInTable($tableName);
		
		return $getResponse;
	}
}

?>