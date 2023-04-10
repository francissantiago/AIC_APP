/*
 Navicat Premium Data Transfer

 Source Server         : localhost
 Source Server Type    : MySQL
 Source Server Version : 50740
 Source Host           : localhost:3306
 Source Schema         : db_aic

 Target Server Type    : MySQL
 Target Server Version : 50740
 File Encoding         : 65001

 Date: 10/04/2023 17:45:27
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for terms_conditions
-- ----------------------------
DROP TABLE IF EXISTS `terms_conditions`;
CREATE TABLE `terms_conditions`  (
  `terms_id` int(11) NOT NULL AUTO_INCREMENT,
  `terms_user_author` int(11) NOT NULL,
  `terms_user_editor` int(11) NOT NULL,
  `terms_title` varchar(255) CHARACTER SET latin1 COLLATE latin1_general_ci NOT NULL,
  `terms_text` longtext CHARACTER SET latin1 COLLATE latin1_general_ci NOT NULL,
  `terms_created_at` timestamp(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  `terms_updated_at` timestamp(0) NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`terms_id`) USING BTREE
) ENGINE = MyISAM AUTO_INCREMENT = 2 CHARACTER SET = latin1 COLLATE = latin1_general_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of terms_conditions
-- ----------------------------
INSERT INTO `terms_conditions` VALUES (1, 1, 1, 'Termos de Usuário', 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nunc fermentum, urna eget finibus\n					fermentum, velit metus maximus erat, nec sodales elit justo vitae sapien. Sed fermentum\n					varius erat, et dictum lorem. Cras pulvinar vestibulum purus sed hendrerit. Praesent et\n					auctor dolor. Ut sed ultrices justo. Fusce tortor erat, scelerisque sit amet diam rhoncus,\n					cursus dictum lorem. Ut vitae arcu egestas, congue nulla at, gravida purus.<br>Donec in justo urna. Fusce pretium quam sed viverra blandit. Vivamus a facilisis lectus.\n					Nunc non aliquet nulla. Aenean arcu metus, dictum tincidunt lacinia quis, efficitur vitae\n					dui. Integer id nisi sit amet leo rutrum placerat in ac tortor. Duis sed fermentum mi, ut\n					vulputate ligula.<br>Vivamus eget sodales elit, cursus scelerisque leo. Suspendisse lorem leo, sollicitudin\n					egestas interdum sit amet, sollicitudin tristique ex. Class aptent taciti sociosqu ad litora\n					torquent per conubia nostra, per inceptos himenaeos. Phasellus id ultricies eros. Praesent\n					vulputate interdum dapibus. Duis varius faucibus metus, eget sagittis purus consectetur in.\n					Praesent fringilla tristique sapien, et maximus tellus dapibus a. Quisque nec magna dapibus\n					sapien iaculis consectetur. Fusce in vehicula arcu. Aliquam erat volutpat. Class aptent\n					taciti sociosqu ad litora torquent per conubia nostra, per inceptos himenaeos. Edit', '2023-04-10 17:34:54', '2023-04-10 17:44:07');

SET FOREIGN_KEY_CHECKS = 1;
