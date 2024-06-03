<?php
class GeneralController
{
    private $conn;

    public function __construct($conn = null)
    {
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
     * @param string|null $whereColumn O nome da coluna para a condição WHERE (opcional).
     * @param mixed $whereValue O valor para a condição WHERE (opcional).
     * @param string|null $whereValueType O tipo do valor para a condição WHERE (opcional).
     * @param int|null $limit O número máximo de linhas a serem retornadas (opcional).
     * @param string|null $orderBy A cláusula ORDER BY para ordenar os resultados (opcional).
     *
     * @return array Um array associativo contendo o código de status e a mensagem da operação.
     *               O código de status pode ser um dos seguintes:
     *               - 200: OK (consulta bem-sucedida).
     *               - 404: Não encontrado (nenhum dado corresponde à consulta).
     *               - 412: Pré-condição falhou (erro ao preparar a consulta).
     *               - 500: Erro interno do servidor (erro ao executar a consulta).
     */
    public function selectAllDataInTable($tableName, $whereColumn = null, $whereValue = null, $whereValueType = null, $limit = null, $orderBy = null)
    {
        $msg = [];
        $sql = "SELECT * FROM $tableName";

        // Adiciona condição WHERE se $whereColumn não for nulo
        if ($whereColumn !== null) {
            $sql .= " WHERE $whereColumn = ?";
        }

        // Adiciona condição ORDER BY se $orderBy não for nulo
        if ($orderBy !== null) {
            $sql .= " ORDER BY $orderBy";
        }

        // Adiciona condição LIMIT se $limit não for nulo
        if ($limit !== null) {
            $sql .= " LIMIT $limit";
        }

        $stmt = $this->conn->prepare($sql);

        if ($stmt === false) {
            $msg = [
                'code' => 412,
                'message' => "Erro ao preparar seleção de informações no banco de dados."
            ];
        } else {
            if ($whereColumn !== null) {
                // Se $whereColumn não for nulo, bind do parâmetro
                $stmt->bind_param($whereValueType, $whereValue);
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

    /**
     * Realiza uma seleção genérica em uma tabela do banco de dados com duas condições.
     *
     * @param string $tableName Nome da tabela.
     * @param string|null $auxColum Nome da primeira coluna para condição WHERE.
     * @param mixed|null $auxParameter Valor do primeiro parâmetro para condição WHERE.
     * @param string|null $auxParameterType Tipo do primeiro parâmetro (usado em bind_param).
     * @param string|null $auxColumTwo Nome da segunda coluna para condição WHERE.
     * @param mixed|null $auxParameterTwo Valor do segundo parâmetro para condição WHERE.
     * @param string|null $auxParameterTypeTwo Tipo do segundo parâmetro (usado em bind_param).
     * @param int|null $auxLimit Limite de registros a serem retornados.
     * @param string|null $auxOrder Coluna usada para ordenar os resultados.
     * 
     * @return array Retorna um array contendo um código de status e a mensagem associada.
     */
    public function selectAllDataInTableWithTwoArguments($tableName, $auxColum = null, $auxParameter = null, $auxParameterType = null, $auxColumTwo = null, $auxParameterTwo = null, $auxParameterTypeTwo = null, $auxLimit = null, $auxOrder = null)
    {
        $msg = [];
        $sql = "SELECT * FROM $tableName WHERE 1=1"; // Adiciona um início de condição sempre verdadeira

        // Adiciona condições WHERE se $auxColum e $auxColumTwo não forem nulos
        if ($auxColum !== null && $auxColumTwo !== null) {
            $sql .= " AND $auxColum = ? AND $auxColumTwo = ?";
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
            if ($auxColum !== null && $auxColumTwo !== null) {
                // Se $auxColum e $auxColumTwo não forem nulos, bind dos parâmetros
                $stmt->bind_param($auxParameterType . $auxParameterTypeTwo, $auxParameter, $auxParameterTwo);
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

    /**
     * Insere dados em uma tabela do banco de dados.
     *
     * Esta função executa uma consulta SQL para inserir dados em uma tabela
     * do banco de dados, com base nas colunas e valores fornecidos.
     *
     * @param string $tableName O nome da tabela do banco de dados.
     * @param array $columns Um array contendo os nomes das colunas a serem inseridas.
     * @param array $values Um array contendo os valores a serem inseridos.
     * @param string $bindTypes Uma string contendo os tipos dos parâmetros a serem vinculados (por exemplo, "sss" para três strings).
     * @param mixed $bindParams Um ou mais parâmetros a serem vinculados à consulta preparada.
     *
     * @return array Um array associativo contendo o código de status e a mensagem da operação.
     *               O código de status pode ser um dos seguintes:
     *               - 200: OK (inserção bem-sucedida).
     *               - 412: Pré-condição falhou (erro ao preparar a consulta).
     *               - 500: Erro interno do servidor (erro ao executar a consulta).
     */
    public function insertDataInTable($tableName, $columns, $values, $bindTypes, $bindParams)
    {
        $msg = [];
        // Construir a string SQL
        $sql = "INSERT INTO $tableName (" . implode(', ', $columns) . ") VALUES (" . implode(', ', $values) . ")";
        $stmt = $this->conn->prepare($sql);

        if ($stmt === false) {
            $msg = [
                'code' => 412,
                'message' => "Erro ao preparar inserção de dados no banco de dados."
            ];
        } else {
            // Vincular os parâmetros
            $stmt->bind_param($bindTypes, ...$bindParams);

            if ($stmt->execute()) {
                // Recupere o último ID inserido dentro da transação
                $lastInsertedId = $this->conn->query("SELECT LAST_INSERT_ID()")->fetch_assoc()['LAST_INSERT_ID()'];

                $msg = [
                    'code' => 200,
                    'message' => "Dados inseridos com sucesso!",
                    'last_inserted_id' => $lastInsertedId
                ];
            } else {
                $msg = [
                    'code' => 500,
                    'message' => "Erro ao executar inserção de dados no banco de dados."
                ];
            }

            $stmt->free_result();
            $stmt->close();
        }

        // Commit da transação
        $this->conn->commit();

        return $msg;
    }

    /**
     * Atualiza dados em uma tabela do banco de dados com múltiplas condições.
     *
     * @param string $updateTable Nome da tabela de atualização.
     * @param array $updateColumns Colunas a serem atualizadas.
     * @param array $updateWhereColumns Colunas de condição para atualização.
     * @param string $updateBindTypes Tipos dos parâmetros (usado em bind_param).
     * @param array $updateBindParams Parâmetros para bind.
     * 
     * @return array Retorna um array contendo um código de status e a mensagem associada.
     */
    public function updateDataWithMultipleParams($updateTable, $updateColumns, $updateWhereColumns, $updateBindTypes, $updateBindParams)
    {
        // Constrói a consulta SQL
        $setColumns = implode(' = ?, ', $updateColumns) . ' = ?';
        $whereConditions = implode(' = ? AND ', $updateWhereColumns) . ' = ?';
        $sql_update = "UPDATE $updateTable SET $setColumns WHERE $whereConditions";

        // Prepara a consulta
        $stmt_update = $this->conn->prepare($sql_update);

        // Inicializa a variável de mensagem
        $msg = [];

        if ($stmt_update === false) {
            // Erro ao preparar a consulta
            $msg = [
                'code' => 412,
                'message' => "Erro ao preparar atualização no banco de dados: " . $this->conn->error
            ];
        } else {
            // Vincula os parâmetros
            $stmt_update->bind_param($updateBindTypes, ...$updateBindParams);

            // Executa a consulta
            if ($stmt_update->execute()) {
                // Verifica se alguma linha foi afetada
                if ($stmt_update->affected_rows > 0) {
                    // Sucesso na atualização
                    $msg = [
                        'code' => 200,
                        'message' => "Registro alterado com sucesso!"
                    ];
                } else {
                    // Nenhuma linha afetada, possivelmente porque os dados já estavam iguais
                    $msg = [
                        'code' => 204,
                        'message' => "Nenhum registro foi alterado. Os dados podem já estar atualizados ou as condições de atualização não foram atendidas."
                    ];
                }
            } else {
                // Erro ao executar a atualização
                $msg = [
                    'code' => 500,
                    'message' => "Erro ao executar atualização no banco de dados: " . $stmt_update->error
                ];
            }

            // Fecha a declaração
            $stmt_update->close();
        }

        return $msg;
    }


    /**
     * Gera um token aleatório de acordo com o tamanho definido
     *
     * @param  mixed $length Tamanho do token
     * @return void
     */
    public function genToken($length)
    {
        $randomBytes = openssl_random_pseudo_bytes($length);
        $token = bin2hex($randomBytes);

        return $token;
    }
}
?>