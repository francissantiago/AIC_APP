<?php
class GeneralController {
    private $conn;
    
    public function __construct($conn){
        $this->conn = $conn;
    }

    /* Função genérica de seleção em um banco de dados */
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