<?php
require_once ($_SERVER['DOCUMENT_ROOT'] . '/settings/vars.php');
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

    public function main($usrDoc)
    {

    }
}

$conn = dbConnection();
$msg = [];

echo json_encode($msg);
?>