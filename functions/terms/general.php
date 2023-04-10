<?php
/* Recupera os dados inclusos na tabela `terms_conditions` */
function get_termsAndCondictions() {
	$db = dbConnection();
	$stmt_query = $db->prepare("
		SELECT
			terms_id,
			terms_user_author,
			terms_user_editor,
			terms_title,
			terms_text,
			terms_created_at,
			terms_updated_at
		FROM
			terms_conditions
	");
	$stmt_query->execute();
	$storeResult_stmt = $stmt_query->get_result();
	$stmt_query->close();

	$results = []; // definir como um array vazio

	if($storeResult_stmt->num_rows >= 1) {
		while ($row = $storeResult_stmt->fetch_assoc()) {
			$results[] = $row; // adicionar resultados ao array
		}
	}

	$db->close();
	return $results;
}

?>