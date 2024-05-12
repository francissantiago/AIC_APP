<?php
class GeneralController {
    private $conn;
    
    public function __construct($conn){
        $this->conn = $conn;
    }

        
    /**
     * Seleciona todos os dados de uma tabela do banco de dados.
     *
     * Esta função executa uma consulta SQL para selecionar todos os dados de uma tabela
     * do banco de dados. Pode opcionalmente adicionar uma condição WHERE, ordenação e
     * limitação aos resultados da consulta.
     *
     * @param string $tableName O nome da tabela do banco de dados.
     * @param string|null $auxColum O nome da coluna para a condição WHERE (opcional).
     * @param mixed $auxParameter O parâmetro para a condição WHERE (opcional).
     * @param string|null $auxParameterType O tipo do parâmetro para a condição WHERE (opcional).
     * @param int|null $auxLimit O número máximo de linhas a serem retornadas (opcional).
     * @param string|null $auxOrder A cláusula ORDER BY para ordenar os resultados (opcional).
     *
     * @return array Um array associativo contendo o código de status e a mensagem da operação.
     *               O código de status pode ser um dos seguintes:
     *               - 200: OK (consulta bem-sucedida).
     *               - 404: Não encontrado (nenhum dado corresponde à consulta).
     *               - 412: Pré-condição falhou (erro ao preparar a consulta).
     *               - 500: Erro interno do servidor (erro ao executar a consulta).
     */
    public function selectAllDataInTable($tableName, $auxColum = null, $auxParameter = null, $auxParameterType = null, $auxLimit = null, $auxOrder = null) {
        $msg = [];
        $sql = "SELECT * FROM $tableName";
        
        // Adiciona condição WHERE se $auxColum não for nulo
        if ($auxColum !== null) {
            $sql .= " WHERE $auxColum = ?";
        }

        // Adiciona condição ORDER BY se $auxOrder não for nulo
        if ($auxOrder !== null) {
            $sql .= " ORDER BY $auxOrder";
        }
        
        // Adiciona condição LIMIT se $auxLimit não for nulo
        if ($auxLimit !== null) {
            $sql .= " LIMIT $auxLimit";
        }
        
        $stmt = $this->conn->prepare($sql);
        
        if ($stmt === false) {
            $msg = [
                'code' => 412,
                'message' => "Erro ao preparar seleção de informações no banco de dados."
            ];
        } else {
            if ($auxColum !== null) {
                // Se $auxColum não for nulo, bind do parâmetro
                $stmt->bind_param($auxParameterType, $auxParameter);
            }
        
            if ($stmt->execute()) {
                $result = $stmt->get_result();
                if ($result->num_rows > 0) {
                    // Se houver resultados, converte para array associativo
                    $result_array = $result->fetch_all(MYSQLI_ASSOC);
                    $msg = [
                        'code' => 200,
                        'message' => $result_array
                    ];
                } else {
                    $msg = [
                        'code' => 404,
                        'message' => "Não existem informações no banco de dados."
                    ];
                }
            } else {
                $msg = [
                    'code' => 500,
                    'message' => "Erro ao executar seleção de informações no banco de dados."
                ];
            }
            $stmt->close();
        }
        
        return $msg;
    }
}
?>