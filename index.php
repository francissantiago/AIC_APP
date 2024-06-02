<?php 
	if (session_status() == PHP_SESSION_NONE) {
		session_start();
	}
	if(!isset($_SESSION['session_user_id']) && !isset($_SESSION['session_user_doc']) && !isset($_SESSION['session_user_email'])){
		header('location: login');
	} else {
		header('location: dashboard');
	}
?>