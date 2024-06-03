<?php
require_once ($_SERVER['DOCUMENT_ROOT'] . '/settings/dbConnection.php');
require_once ($_SERVER['DOCUMENT_ROOT'] . '/controllers/general/GeneralController.php');
require_once ($_SERVER['DOCUMENT_ROOT'] . '/controllers/general/MailerController.php');

class TestsController extends GeneralController
{
    private $conn;

    public function __construct($conn)
    {
        $this->conn = $conn;
    }

    public function main($field_01, $field_02)
    {


    }

    /**
     * Valida o token de registro de um usuário.
     *
     * @param int $userID O ID do usuário.
     * @param string $token O token de registro do usuário.
     * @param object $getClass A instância da classe que contém os métodos necessários.
     * @return array Um array associativo contendo o código de status e a mensagem de sucesso ou erro.
     */
    public function validateRegisterToken($userID, $token, $getClass)
    {
        $response = [];
        $tableName = "user_temp_tokens";
        $auxColum = "user_temp_token_user_id";
        $auxParameter = $userID;
        $auxParameterType = 'i';
        $auxColumTwo = "user_temp_token_code";
        $auxParameterTwo = $token;
        $auxParameterTypeTwo = "s";

        $callMethod = $getClass->selectAllDataInTableWithTwoArguments($tableName, $auxColum, $auxParameter, $auxParameterType, $auxColumTwo, $auxParameterTwo, $auxParameterTypeTwo);

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
                $response = ['code' => 303, 'message' => "Seu token expirou! Tente realizar login para receber um novo código!"];
            } else {
                $confirmRegisterToken = $this->confirmRegisterToken($userID, $token, $getClass);

                if ($confirmRegisterToken['code'] === 200) {
                    $newStatus = 2;
                    $updateUserStatus = $this->updateUserStatus($userID, $newStatus, $getClass);
                    if ($updateUserStatus['code'] === 200) {
                        return ['code' => 200, 'message' => 'E-mail verificado! Prossiga para o login.'];
                    }
                    return $updateUserStatus;
                }
                return $confirmRegisterToken;
            }

        } else {
            $response = ['code' => 404, 'message' => 'Dados informados incorretos! Verifique novamente.'];
        }

        return $response;
    }

    /**
     * Confirma o token de registro do usuário.
     * 
     * @param int $userID O ID do usuário.
     * @param string $token O token de registro.
     * @param object $getClass A instância da classe que contém os métodos necessários.
     * @return array Um array associativo contendo o código de status e a mensagem de sucesso ou erro.
     */
    public function confirmRegisterToken($userID, $token, $getClass)
    {
        $token_validated = 1;
        $updateTable = "user_temp_tokens";
        $updateColumns = ["user_temp_token_validated"];
        $updateWhereColumns = ["user_temp_token_user_id", "user_temp_token_code"];
        $updateBindTypes = "iis";
        $updateBindParams = [$token_validated, $userID, $token];

        $callMethod = $getClass->updateDataWithMultipleParams($updateTable, $updateColumns, $updateWhereColumns, $updateBindTypes, $updateBindParams);
        if ($callMethod['code'] === 200) {
            return ['code' => 200, 'message' => 'E-mail confirmado!'];
        }

        return $callMethod;
    }

    /**
     * Atualiza o status de um usuário.
     *
     * @param int $userID O ID do usuário.
     * @param int $newStatus O novo status do usuário.
     * @param object $getClass A instância da classe que contém os métodos necessários.
     * @return array Um array associativo contendo o código de status e a mensagem de sucesso ou erro.
     */
    public function updateUserStatus($userID, $newStatus, $getClass)
    {
        $updateTable = "users";
        $updateColumns = ["user_status"];
        $updateWhereColumns = ["user_id"];
        $updateBindTypes = "ii";
        $updateBindParams = [$newStatus, $userID];

        $callMethod = $getClass->updateDataWithMultipleParams($updateTable, $updateColumns, $updateWhereColumns, $updateBindTypes, $updateBindParams);
        if ($callMethod['code'] === 200) {
            return ['code' => 200, 'message' => 'Status de usuário alterado!'];
        }

        return $callMethod;
    }
}
?>