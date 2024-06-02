<?php
header('Content-Type: application/json; charset=utf-8');

$msg = [];
/* Validar método de acesso ao arquivo */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (
        isset(
        $_POST['userName'],
        $_POST['userDoc'],
        $_POST['userBirth'],
        $_POST['userEmail'],
        $_POST['userPassword'],
        $_POST['userRepeatPassword'],
        $_POST['policyCheckbox'],
        $_POST['termCheckbox'],
        $_POST['userLegalResponsibleName'],
        $_POST['userLegalResponsibleDoc']
    )
    ) {
        require_once ($_SERVER['DOCUMENT_ROOT'] . '/settings/dbConnection.php');
        require_once ($_SERVER['DOCUMENT_ROOT'] . '/controllers/users/UsersController.php');
        // Atribuição dos dados recebidos em variáveis
        $userName = $_POST['userName'];
        $userDoc = $_POST['userDoc'];
        $userBirth = $_POST['userBirth'];
        $userEmail = $_POST['userEmail'];
        $userPassword = $_POST['userPassword'];
        $userRepeatPassword = $_POST['userRepeatPassword'];
        $policyCheckbox = boolval($_POST['policyCheckbox']);
        $termCheckbox = boolval($_POST['termCheckbox']);
        $userLegalResponsibleName = $_POST['userLegalResponsibleName'];
        $userLegalResponsibleDoc = $_POST['userLegalResponsibleDoc'];

        // Formatação dos campos
        $userDocNoFormating = str_replace(['.', '-'], '', $userDoc);
        $userLegalResponsibleDocNoFormating = str_replace(['.', '-'], '', $userDoc);
        $userBirthTimestamp = DateTime::createFromFormat('d/m/Y', $userBirth)->format('Y-m-d H:i:s');

        // Cadastro do usuário
        $conn = dbConnection();
        $getClass = new UsersController($conn);

        $registerUser = $getClass->addUser($userName, $userDocNoFormating, $userBirthTimestamp, $userEmail, $userPassword, $userLegalResponsibleName, $userLegalResponsibleDocNoFormating);
        $msg = $registerUser;

    } else {
        // Verifica os campos ausentes
        $missingFileds = [];
        if (!isset($_POST['userName'])) {
            $missingFileds[] = 'Nome';
        }
        if (!isset($_POST['userDoc'])) {
            $missingFileds[] = 'CPF';
        }
        if (!isset($_POST['userBirth'])) {
            $missingFileds[] = 'Data de Nascimento';
        }
        if (!isset($_POST['userEmail'])) {
            $missingFileds[] = 'E-mail';
        }
        if (!isset($_POST['userPassword'])) {
            $missingFileds[] = 'Senha';
        }
        if (!isset($_POST['userRepeatPassword'])) {
            $missingFileds[] = 'Repetir a Senha';
        }
        if (!isset($_POST['policyCheckbox'])) {
            $missingFileds[] = 'Política de Usuário';
        }
        if (!isset($_POST['termCheckbox'])) {
            $missingFileds[] = 'Termos e Condições de Usuário';
        }

        // Relaciona os campos ausentes e retorna o erro com dados mais completos sobre os campos ausentes
        $msg = [
            'code' => 400,
            'message' => 'Existe(m) campo(s) ausente(s) no formulário! Por favor corrija o(s) campo(s): ' . implode(', ', $missingFields)
        ];
    }

} else {
    // Coleta informações sobre o autor do acesso
    $ip = $_SERVER['REMOTE_ADDR'];
    $timestamp = date("Y-m-d H:i:s");
    $url = $_SERVER['REQUEST_URI'];
    $browser_info = get_browser(null, true);

    // Retorna erro ao receber uma tentativa de acesso direto ao arquivo
    $msg = [
        'code' => 500,
        'message' => [
            'IP:' => $ip,
            'URL' => $url,
            'BROWSER:' => $browser_info,
            'DATE:' => $timestamp
        ],
        'error_log:' => 'Tentativa de acesso negada! Dados coletados e armazenados!'
    ];
}

echo json_encode($msg);

?>