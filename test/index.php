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

    public function main()
    {

    }
}
$msg = [];
$conn = dbConnection();
$callClass = new TestsController($conn);
$callMethod = $callClass->main();

echo json_encode($callMethod);
?>