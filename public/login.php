<?php
$path = $_SERVER['DOCUMENT_ROOT'];
include_once($path.'/public/partials/header.php');
?>
<!-- App Capsule -->
<div id="appCapsule">
	<div class="section mt-2 text-center">
		<h1>Log in</h1>
		<h4>Preencha o formulário para entrar</h4>
	</div>
	<div class="section mb-5 p-2">
		<form action="index.html">
			<div class="card">
				<div class="card-body pb-1">
					<div class="form-group basic">
						<div class="input-wrapper">
							<label class="label" for="email1">CPF</label>
							<input type="email" class="form-control" id="email1" placeholder="Seu e-mail">
							<i class="clear-input">
								<ion-icon name="close-circle"></ion-icon>
							</i>
						</div>
					</div>

					<div class="form-group basic">
						<div class="input-wrapper">
							<label class="label" for="password1">Password</label>
							<input type="password" class="form-control" id="password1" autocomplete="off"
								placeholder="Your password">
							<i class="clear-input">
								<ion-icon name="close-circle"></ion-icon>
							</i>
						</div>
					</div>
				</div>
			</div>
			<div class="form-links mt-2">
				<div>
					<a href="app-register.html">Register Now</a>
				</div>
				<div><a href="app-forgot-password.html" class="text-muted">Forgot Password?</a></div>
			</div>
			<div class="form-button-group  transparent">
				<button type="submit" class="btn btn-primary btn-block btn-lg">Log in</button>
			</div>
		</form>
	</div>
</div>
<!-- * App Capsule -->
<!-- ========= JS Files =========  -->
<!-- Bootstrap -->
<script src="<?php $path;?>/assets/js/lib/bootstrap.bundle.min.js"></script>
<!-- Ionicons -->
<script type="module" src="https://unpkg.com/ionicons@5.5.2/dist/ionicons/ionicons.js"></script>
<!-- Splide -->
<script src="<?php $path;?>/assets/js/plugins/splide/splide.min.js"></script>
<!-- Base Js File -->
<script src="<?php $path;?>/assets/js/base.js"></script>
</body>
</html>