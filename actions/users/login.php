<?php
header('Content-Type: application/json; charset=utf-8');

$msg = [];
/* Validar método de acesso ao arquivo */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (
        isset(
        $_POST['login_user_val'],
        $_POST['login_password_val']
    )
    ) {
        require_once ($_SERVER['DOCUMENT_ROOT'] . '/settings/dbConnection.php');
        require_once ($_SERVER['DOCUMENT_ROOT'] . '/controllers/users/UsersController.php');
        // Atribuição dos dados recebidos em variáveis
        $userDoc = $_POST['login_user_val'];
        $userPassword = $_POST['login_password_val'];

        // Formatação dos campos
        $userDocNoFormating = str_replace(['.', '-'], '', $userDoc);

        // Cadastro do usuário
        $conn = dbConnection();
        $getClass = new UsersController($conn);

        $registerUser = $getClass->loginUsr($userDocNoFormating, $userPassword);
        $msg = $registerUser;

    } else {
        // Verifica os campos ausentes
        $missingFields = [];
        if (!isset($_POST['login_user_val'])) {
            $missingFields[] = 'CPF';
        }
        if (!isset($_POST['login_password_val'])) {
            $missingFields[] = 'Senha';
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