<?php 
	if (session_status() == PHP_SESSION_NONE) {
		session_start();
	}
	if (!isset($_SESSION['userLogin'])) {
		header('location: login');
	} else {
		header('location: dashboard');
	}
?>