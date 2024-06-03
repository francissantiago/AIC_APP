<?php
$msg = [];
/* Validar método de acesso ao arquivo */
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (
        isset(
        $_GET['user_id'],
        $_GET['user_token']
    ) &&
        !empty([
            $_GET['user_id']
        ]) &&
        !empty(
        $_GET['user_token']
    )
    ) {
        require_once ($_SERVER['DOCUMENT_ROOT'] . '/settings/dbConnection.php');
        require_once ($_SERVER['DOCUMENT_ROOT'] . '/controllers/general/GeneralController.php');
        require_once ($_SERVER['DOCUMENT_ROOT'] . '/controllers/users/UsersController.php');

        // Atribuição dos dados recebidos em variáveis
        $field_01 = $_GET['user_id'];
        $field_02 = $_GET['user_token'];

        // Cadastro do usuário
        $conn = dbConnection();
        $getClass = new UsersController($conn);
        $getGeneralClass = new GeneralController($conn);

        $response = $getClass->validateRegisterToken($field_01, $field_02, $getGeneralClass);
        if ($response['code'] === 200) {
            $templateHTML = file_get_contents($_SERVER['DOCUMENT_ROOT'] . '/terminal_template.php');
            $meta_tag = '<meta http-equiv="refresh" content="10; url=/login">';
            $redirect_time = '10 segundos';
            $replacedHTML = str_replace(['PHP_TITLE_CODE', 'PHP_MESSAGE', 'PHP_TIME', 'PHP_META_TAG'], [$response['code'], $response['message'], $redirect_time, $meta_tag], $templateHTML);

            echo $replacedHTML;
            exit;
        }

        $templateHTML = file_get_contents($_SERVER['DOCUMENT_ROOT'] . '/terminal_template.php');
        $meta_tag = '<meta http-equiv="refresh" content="10; url=/login">';
        $redirect_time = '10 segundos';
        $replacedHTML = str_replace(['PHP_TITLE_CODE', 'PHP_MESSAGE', 'PHP_TIME', 'PHP_META_TAG'], [$response['code'], $response['message'], $redirect_time, $meta_tag], $templateHTML);

        echo $replacedHTML;
        exit;

    } else {
        // Verifica os campos ausentes
        $missingFields = [];
        if (!isset($_GET['user_id']) || empty($_GET['user_id'])) {
            $missingFields[] = 'FIELD_01';
        }
        if (!isset($_GET['user_token']) || empty($_GET['user_token'])) {
            $missingFields[] = 'FIELD_02';
        }

        $templateHTML = file_get_contents($_SERVER['DOCUMENT_ROOT'] . '/terminal_template.php');
        $meta_tag = '<meta http-equiv="refresh" content="10; url=/login">';
        $code = 400;
        $message = 'Existe(m) campo(s) ausente(s) no formulário! Por favor corrija o(s) campo(s): ' . implode(', ', $missingFields);
        $redirect_time = '10 segundos';
        $replacedHTML = str_replace(['PHP_TITLE_CODE', 'PHP_MESSAGE', 'PHP_TIME', 'PHP_META_TAG'], [$code, $message, $redirect_time, $meta_tag], $templateHTML);

        echo $replacedHTML;
        exit;
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