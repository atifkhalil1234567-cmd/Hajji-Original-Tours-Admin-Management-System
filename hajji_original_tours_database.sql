-- ==========================================================
-- Hajji Original Tours Database Schema
-- Production Ready Schema for Hostinger MySQL / phpMyAdmin
-- Engine: InnoDB | Charset: utf8mb4 | Collation: utf8mb4_unicode_ci
-- ==========================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- ----------------------------------------------------------
-- 1. ADMINS & SECURITY
-- ----------------------------------------------------------

DROP TABLE IF EXISTS `role_permissions`;
DROP TABLE IF EXISTS `admin_permissions`;
DROP TABLE IF EXISTS `admin_roles`;
DROP TABLE IF EXISTS `admins`;
DROP TABLE IF EXISTS `login_attempts`;
DROP TABLE IF EXISTS `password_resets`;
DROP TABLE IF EXISTS `admin_activity_logs`;

CREATE TABLE `admin_roles` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `slug` VARCHAR(60) NOT NULL UNIQUE,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `is_system` TINYINT(1) DEFAULT 0,
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `admin_permissions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `module` VARCHAR(50) NOT NULL,
  `action` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) NULL,
  UNIQUE (`module`, `action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `role_permissions` (
  `role_id` INT UNSIGNED NOT NULL,
  `permission_id` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`role_id`, `permission_id`),
  CONSTRAINT `fk_rp_role` FOREIGN KEY (`role_id`) REFERENCES `admin_roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_rp_perm` FOREIGN KEY (`permission_id`) REFERENCES `admin_permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `admins` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `role_id` INT UNSIGNED NOT NULL,
  `first_name` VARCHAR(60) NOT NULL,
  `last_name` VARCHAR(60) NOT NULL,
  `username` VARCHAR(60) NOT NULL UNIQUE,
  `email` VARCHAR(120) NOT NULL UNIQUE,
  `phone` VARCHAR(30) NULL,
  `password` VARCHAR(255) NOT NULL,
  `avatar` VARCHAR(255) NULL,
  `two_factor_enabled` TINYINT(1) DEFAULT 0,
  `two_factor_secret` VARCHAR(100) NULL,
  `status` ENUM('active', 'inactive', 'suspended') DEFAULT 'active',
  `failed_login_count` INT UNSIGNED DEFAULT 0,
  `last_login_at` DATETIME NULL,
  `last_login_ip` VARCHAR(45) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT `fk_admins_role` FOREIGN KEY (`role_id`) REFERENCES `admin_roles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `login_attempts` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `username_or_email` VARCHAR(120) NOT NULL,
  `ip_address` VARCHAR(45) NOT NULL,
  `user_agent` TEXT NULL,
  `status` ENUM('success', 'failed', 'blocked') NOT NULL,
  `attempted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `password_resets` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(120) NOT NULL,
  `token` VARCHAR(120) NOT NULL,
  `used` TINYINT(1) DEFAULT 0,
  `expires_at` DATETIME NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `admin_activity_logs` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `admin_id` INT UNSIGNED NULL,
  `module` VARCHAR(60) NOT NULL,
  `action` VARCHAR(60) NOT NULL,
  `record_id` VARCHAR(60) NULL,
  `description` TEXT NOT NULL,
  `old_values` LONGTEXT NULL,
  `new_values` LONGTEXT NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_act_admin` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 2. SYSTEM, CURRENCIES, TAX & CMS
-- ----------------------------------------------------------

CREATE TABLE `currencies` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(10) NOT NULL UNIQUE,
  `name` VARCHAR(50) NOT NULL,
  `symbol` VARCHAR(10) NOT NULL,
  `is_default` TINYINT(1) DEFAULT 0,
  `status` ENUM('active', 'inactive') DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `exchange_rates` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `from_currency` VARCHAR(10) NOT NULL,
  `to_currency` VARCHAR(10) NOT NULL,
  `rate` DECIMAL(12, 6) NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE (`from_currency`, `to_currency`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tax_settings` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `rate_percent` DECIMAL(6, 2) NOT NULL DEFAULT 0.00,
  `is_inclusive` TINYINT(1) DEFAULT 0,
  `is_default` TINYINT(1) DEFAULT 1,
  `status` ENUM('active', 'inactive') DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `system_settings` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `setting_key` VARCHAR(100) NOT NULL UNIQUE,
  `setting_value` LONGTEXT NULL,
  `group_name` VARCHAR(50) DEFAULT 'general',
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `site_settings` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `site_name` VARCHAR(120) NOT NULL DEFAULT 'Hajji Original Tours',
  `tagline` VARCHAR(255) DEFAULT 'Premium Hajj, Umrah & Spiritual Journey Services',
  `logo_url` VARCHAR(255) NULL,
  `favicon_url` VARCHAR(255) NULL,
  `email` VARCHAR(120) DEFAULT 'info@hajjioriginal.com',
  `phone` VARCHAR(40) DEFAULT '+966 12 555 0199',
  `whatsapp` VARCHAR(40) DEFAULT '+966 50 123 4567',
  `address` TEXT NULL,
  `makkah_office` TEXT NULL,
  `madinah_office` TEXT NULL,
  `facebook_url` VARCHAR(255) NULL,
  `instagram_url` VARCHAR(255) NULL,
  `youtube_url` VARCHAR(255) NULL,
  `twitter_url` VARCHAR(255) NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `media_library` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `filename` VARCHAR(255) NOT NULL,
  `original_name` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(255) NOT NULL,
  `file_url` VARCHAR(255) NOT NULL,
  `file_type` VARCHAR(50) NOT NULL,
  `file_size` BIGINT UNSIGNED NOT NULL,
  `folder` VARCHAR(100) DEFAULT 'general',
  `alt_text` VARCHAR(255) NULL,
  `title` VARCHAR(255) NULL,
  `caption` TEXT NULL,
  `uploaded_by` INT UNSIGNED NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_media_admin` FOREIGN KEY (`uploaded_by`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pages` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `slug` VARCHAR(120) NOT NULL UNIQUE,
  `title` VARCHAR(200) NOT NULL,
  `summary` TEXT NULL,
  `content` LONGTEXT NULL,
  `featured_image` VARCHAR(255) NULL,
  `meta_title` VARCHAR(200) NULL,
  `meta_description` TEXT NULL,
  `meta_keywords` VARCHAR(255) NULL,
  `canonical_url` VARCHAR(255) NULL,
  `og_title` VARCHAR(200) NULL,
  `og_description` TEXT NULL,
  `og_image` VARCHAR(255) NULL,
  `status` ENUM('published', 'draft', 'archived') DEFAULT 'published',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `page_sections` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `page_id` INT UNSIGNED NOT NULL,
  `section_key` VARCHAR(100) NOT NULL,
  `title` VARCHAR(200) NULL,
  `subtitle` VARCHAR(255) NULL,
  `content` LONGTEXT NULL,
  `image_url` VARCHAR(255) NULL,
  `display_order` INT DEFAULT 0,
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  CONSTRAINT `fk_section_page` FOREIGN KEY (`page_id`) REFERENCES `pages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `menus` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `location` ENUM('header', 'footer', 'mobile', 'sidebar') NOT NULL,
  `name` VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `menu_items` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `menu_id` INT UNSIGNED NOT NULL,
  `parent_id` INT UNSIGNED NULL,
  `label` VARCHAR(100) NOT NULL,
  `url` VARCHAR(255) NOT NULL,
  `display_order` INT DEFAULT 0,
  `target` VARCHAR(20) DEFAULT '_self',
  CONSTRAINT `fk_menu_rel` FOREIGN KEY (`menu_id`) REFERENCES `menus` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `sliders` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(200) NOT NULL,
  `subtitle` TEXT NULL,
  `badge` VARCHAR(100) NULL,
  `primary_btn_text` VARCHAR(60) NULL,
  `primary_btn_url` VARCHAR(255) NULL,
  `secondary_btn_text` VARCHAR(60) NULL,
  `secondary_btn_url` VARCHAR(255) NULL,
  `image_url` VARCHAR(255) NOT NULL,
  `display_order` INT DEFAULT 0,
  `status` ENUM('active', 'inactive') DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `banners` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(200) NOT NULL,
  `location` VARCHAR(80) NOT NULL,
  `link_url` VARCHAR(255) NULL,
  `image_url` VARCHAR(255) NOT NULL,
  `start_date` DATE NULL,
  `end_date` DATE NULL,
  `status` ENUM('active', 'inactive') DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `faqs` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `category` VARCHAR(80) DEFAULT 'General',
  `question` VARCHAR(255) NOT NULL,
  `answer` TEXT NOT NULL,
  `display_order` INT DEFAULT 0,
  `is_published` TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `testimonials` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `pilgrim_name` VARCHAR(120) NOT NULL,
  `location` VARCHAR(100) NULL,
  `package_name` VARCHAR(150) NULL,
  `rating` TINYINT DEFAULT 5,
  `review` TEXT NOT NULL,
  `avatar_url` VARCHAR(255) NULL,
  `video_url` VARCHAR(255) NULL,
  `is_featured` TINYINT(1) DEFAULT 0,
  `is_verified` TINYINT(1) DEFAULT 1,
  `status` ENUM('published', 'pending', 'hidden') DEFAULT 'published'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 3. PACKAGES & ITINERARIES
-- ----------------------------------------------------------

CREATE TABLE `package_categories` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(120) NOT NULL UNIQUE,
  `type` ENUM('hajj', 'umrah', 'ziyarat', 'combined') NOT NULL,
  `description` TEXT NULL,
  `status` ENUM('active', 'inactive') DEFAULT 'active'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `packages` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `category_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `slug` VARCHAR(220) NOT NULL UNIQUE,
  `package_type` ENUM('hajj', 'umrah', 'ziyarat', 'ramadan_umrah', 'vip_hajj') NOT NULL,
  `hajj_type` ENUM('shifting', 'non_shifting', 'express', 'not_applicable') DEFAULT 'not_applicable',
  `hijri_year` INT NULL,
  `gregorian_year` INT NOT NULL DEFAULT 2026,
  `duration_days` INT NOT NULL DEFAULT 14,
  `origin_city` VARCHAR(100) DEFAULT 'London',
  `starting_price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `currency` VARCHAR(10) DEFAULT 'USD',
  `total_seats` INT UNSIGNED NOT NULL DEFAULT 50,
  `booked_seats` INT UNSIGNED NOT NULL DEFAULT 0,
  `flights_included` TINYINT(1) DEFAULT 1,
  `visa_included` TINYINT(1) DEFAULT 1,
  `ziyarat_included` TINYINT(1) DEFAULT 1,
  `qurbani_included` TINYINT(1) DEFAULT 0,
  `is_customizable` TINYINT(1) DEFAULT 0,
  `is_featured` TINYINT(1) DEFAULT 0,
  `short_summary` TEXT NULL,
  `detailed_description` LONGTEXT NULL,
  `featured_image` VARCHAR(255) NULL,
  `seo_title` VARCHAR(200) NULL,
  `meta_description` TEXT NULL,
  `meta_keywords` VARCHAR(255) NULL,
  `canonical_url` VARCHAR(255) NULL,
  `status` ENUM('published', 'draft', 'archived') DEFAULT 'published',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT `fk_pkg_cat` FOREIGN KEY (`category_id`) REFERENCES `package_categories` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `package_departures` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `package_id` INT UNSIGNED NOT NULL,
  `departure_title` VARCHAR(120) NOT NULL,
  `departure_date` DATE NOT NULL,
  `return_date` DATE NOT NULL,
  `total_seats` INT UNSIGNED NOT NULL DEFAULT 50,
  `booked_seats` INT UNSIGNED NOT NULL DEFAULT 0,
  `status` ENUM('available', 'almost_full', 'sold_out', 'closed') DEFAULT 'available',
  CONSTRAINT `fk_dep_pkg` FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `package_prices` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `package_id` INT UNSIGNED NOT NULL,
  `departure_id` INT UNSIGNED NULL,
  `room_type` ENUM('single', 'double', 'triple', 'quad', 'quint', 'sharing') NOT NULL,
  `adult_price` DECIMAL(10, 2) NOT NULL,
  `child_with_bed_price` DECIMAL(10, 2) DEFAULT 0.00,
  `child_no_bed_price` DECIMAL(10, 2) DEFAULT 0.00,
  `infant_price` DECIMAL(10, 2) DEFAULT 0.00,
  `deposit_amount` DECIMAL(10, 2) DEFAULT 500.00,
  CONSTRAINT `fk_price_pkg` FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_price_dep` FOREIGN KEY (`departure_id`) REFERENCES `package_departures` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `package_itineraries` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `package_id` INT UNSIGNED NOT NULL,
  `day_number` INT NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `city` ENUM('Makkah', 'Madinah', 'Mina', 'Arafat', 'Muzdalifah', 'Jeddah', 'Transit') NOT NULL,
  `description` TEXT NOT NULL,
  `meals_included` VARCHAR(100) NULL,
  CONSTRAINT `fk_itin_pkg` FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `package_inclusions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `package_id` INT UNSIGNED NOT NULL,
  `item_text` VARCHAR(255) NOT NULL,
  `display_order` INT DEFAULT 0,
  CONSTRAINT `fk_inc_pkg` FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `package_exclusions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `package_id` INT UNSIGNED NOT NULL,
  `item_text` VARCHAR(255) NOT NULL,
  `display_order` INT DEFAULT 0,
  CONSTRAINT `fk_exc_pkg` FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `package_services` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `package_id` INT UNSIGNED NOT NULL,
  `service_name` VARCHAR(150) NOT NULL,
  `price` DECIMAL(10, 2) DEFAULT 0.00,
  `is_mandatory` TINYINT(1) DEFAULT 0,
  CONSTRAINT `fk_serv_pkg` FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `package_images` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `package_id` INT UNSIGNED NOT NULL,
  `image_url` VARCHAR(255) NOT NULL,
  `caption` VARCHAR(200) NULL,
  `display_order` INT DEFAULT 0,
  CONSTRAINT `fk_img_pkg` FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 4. HOTELS & ROOMS
-- ----------------------------------------------------------

CREATE TABLE `hotels` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `city` ENUM('Makkah', 'Madinah', 'Jeddah', 'Riyadh') NOT NULL,
  `star_rating` TINYINT NOT NULL DEFAULT 5,
  `distance_meters` INT DEFAULT 150,
  `shuttle_available` TINYINT(1) DEFAULT 0,
  `address` TEXT NOT NULL,
  `latitude` DECIMAL(10, 7) NULL,
  `longitude` DECIMAL(10, 7) NULL,
  `phone` VARCHAR(40) NULL,
  `email` VARCHAR(120) NULL,
  `website` VARCHAR(200) NULL,
  `check_in_time` VARCHAR(20) DEFAULT '14:00',
  `check_out_time` VARCHAR(20) DEFAULT '12:00',
  `featured_image` VARCHAR(255) NULL,
  `description` TEXT NULL,
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `hotel_facilities` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(80) NOT NULL UNIQUE,
  `icon` VARCHAR(60) DEFAULT 'check'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `hotel_facility_relations` (
  `hotel_id` INT UNSIGNED NOT NULL,
  `facility_id` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`hotel_id`, `facility_id`),
  CONSTRAINT `fk_hfr_h` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_hfr_f` FOREIGN KEY (`facility_id`) REFERENCES `hotel_facilities` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `hotel_rooms` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `hotel_id` INT UNSIGNED NOT NULL,
  `room_name` VARCHAR(100) NOT NULL,
  `room_type` ENUM('single', 'double', 'triple', 'quad', 'suite', 'family') NOT NULL,
  `view_type` ENUM('kaaba_view', 'haram_view', 'city_view', 'standard') DEFAULT 'city_view',
  `capacity_adults` TINYINT NOT NULL DEFAULT 2,
  `capacity_children` TINYINT DEFAULT 1,
  `amenities` TEXT NULL,
  `status` ENUM('available', 'maintenance', 'blocked') DEFAULT 'available',
  CONSTRAINT `fk_room_hotel` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `hotel_room_prices` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `room_id` INT UNSIGNED NOT NULL,
  `season_name` VARCHAR(100) NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `price_per_night` DECIMAL(10, 2) NOT NULL,
  `breakfast_included` TINYINT(1) DEFAULT 1,
  CONSTRAINT `fk_hrp_room` FOREIGN KEY (`room_id`) REFERENCES `hotel_rooms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `package_hotels` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `package_id` INT UNSIGNED NOT NULL,
  `hotel_id` INT UNSIGNED NOT NULL,
  `nights_count` INT NOT NULL DEFAULT 7,
  `meal_plan` VARCHAR(60) DEFAULT 'Half Board',
  CONSTRAINT `fk_pkh_pkg` FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pkh_htl` FOREIGN KEY (`hotel_id`) REFERENCES `hotels` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 5. CUSTOMERS & CRM
-- ----------------------------------------------------------

CREATE TABLE `customers` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `customer_code` VARCHAR(40) NOT NULL UNIQUE,
  `first_name` VARCHAR(60) NOT NULL,
  `last_name` VARCHAR(60) NOT NULL,
  `email` VARCHAR(120) NOT NULL UNIQUE,
  `phone` VARCHAR(40) NOT NULL,
  `whatsapp` VARCHAR(40) NULL,
  `nationality` VARCHAR(80) DEFAULT 'British',
  `country_of_residence` VARCHAR(80) DEFAULT 'United Kingdom',
  `vip_level` ENUM('Standard', 'Silver', 'Gold', 'Platinum') DEFAULT 'Standard',
  `status` ENUM('active', 'inactive', 'archived') DEFAULT 'active',
  `lead_source` VARCHAR(80) DEFAULT 'Website',
  `notes_summary` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `customer_addresses` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `customer_id` INT UNSIGNED NOT NULL,
  `address_line1` VARCHAR(200) NOT NULL,
  `address_line2` VARCHAR(200) NULL,
  `city` VARCHAR(80) NOT NULL,
  `state_province` VARCHAR(80) NULL,
  `postal_code` VARCHAR(30) NOT NULL,
  `country` VARCHAR(80) NOT NULL,
  `is_primary` TINYINT(1) DEFAULT 1,
  CONSTRAINT `fk_ca_cust` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `customer_passports` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `customer_id` INT UNSIGNED NOT NULL,
  `passport_number` VARCHAR(60) NOT NULL,
  `issuing_country` VARCHAR(80) NOT NULL,
  `nationality` VARCHAR(80) NOT NULL,
  `issue_date` DATE NOT NULL,
  `expiry_date` DATE NOT NULL,
  `place_of_issue` VARCHAR(100) NULL,
  `scan_file_url` VARCHAR(255) NULL,
  `status` ENUM('Valid', 'Expiring Soon', 'Expired', 'Rejected') DEFAULT 'Valid',
  `verification_notes` TEXT NULL,
  CONSTRAINT `fk_cp_cust` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `customer_emergency_contacts` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `customer_id` INT UNSIGNED NOT NULL,
  `contact_name` VARCHAR(100) NOT NULL,
  `relationship` VARCHAR(50) NOT NULL,
  `phone` VARCHAR(40) NOT NULL,
  `email` VARCHAR(120) NULL,
  CONSTRAINT `fk_cec_cust` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `tags` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(60) NOT NULL UNIQUE,
  `color_code` VARCHAR(20) DEFAULT '#10b981'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `customer_tag_relations` (
  `customer_id` INT UNSIGNED NOT NULL,
  `tag_id` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`customer_id`, `tag_id`),
  CONSTRAINT `fk_ctr_c` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ctr_t` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `customer_notes` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `customer_id` INT UNSIGNED NOT NULL,
  `admin_id` INT UNSIGNED NULL,
  `category` ENUM('General', 'CRM', 'Medical', 'VIP Preference', 'Financial') DEFAULT 'General',
  `note` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_cn_cust` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cn_adm` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `customer_interactions` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `customer_id` INT UNSIGNED NOT NULL,
  `admin_id` INT UNSIGNED NULL,
  `channel` ENUM('Call', 'WhatsApp', 'Email Sent', 'Email Received', 'Portal Login', 'Office Visit', 'Payment Logged') NOT NULL,
  `summary` VARCHAR(255) NOT NULL,
  `details` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ci_cust` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ci_adm` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `leads` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `full_name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(120) NOT NULL,
  `phone` VARCHAR(40) NOT NULL,
  `package_interest` VARCHAR(150) NULL,
  `destination` ENUM('Hajj', 'Umrah', 'Ziyarat', 'Custom') DEFAULT 'Umrah',
  `num_travelers` INT DEFAULT 2,
  `budget_range` VARCHAR(100) NULL,
  `source` VARCHAR(80) DEFAULT 'Website',
  `assigned_admin_id` INT UNSIGNED NULL,
  `status` ENUM('New', 'Contacted', 'Follow-up', 'Proposal Sent', 'Converted', 'Lost') DEFAULT 'New',
  `priority` ENUM('Low', 'Medium', 'High', 'Urgent') DEFAULT 'Medium',
  `followup_due_date` DATETIME NULL,
  `notes` TEXT NULL,
  `converted_customer_id` INT UNSIGNED NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `fk_lead_adm` FOREIGN KEY (`assigned_admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_lead_cust` FOREIGN KEY (`converted_customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 6. BOOKINGS & TRAVELERS
-- ----------------------------------------------------------

CREATE TABLE `booking_statuses` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE,
  `label` VARCHAR(80) NOT NULL,
  `badge_color` VARCHAR(20) DEFAULT '#3b82f6',
  `is_active` TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `bookings` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `booking_number` VARCHAR(50) NOT NULL UNIQUE,
  `customer_id` INT UNSIGNED NOT NULL,
  `package_id` INT UNSIGNED NOT NULL,
  `departure_id` INT UNSIGNED NULL,
  `assigned_admin_id` INT UNSIGNED NULL,
  `booking_status_id` INT UNSIGNED NOT NULL,
  `payment_status` ENUM('Unpaid', 'Partially Paid', 'Fully Paid', 'Refunded', 'Overdue') DEFAULT 'Unpaid',
  `visa_status` ENUM('Not Started', 'Documents Pending', 'Submitted to MOFA', 'Approved', 'Rejected') DEFAULT 'Not Started',
  `flight_status` ENUM('Unassigned', 'Booked', 'Ticketed', 'Changed', 'Cancelled') DEFAULT 'Unassigned',
  `hotel_status` ENUM('Pending', 'Reserved', 'Confirmed', 'Checked In', 'Completed') DEFAULT 'Pending',
  `num_adults` INT NOT NULL DEFAULT 1,
  `num_children` INT NOT NULL DEFAULT 0,
  `num_infants` INT NOT NULL DEFAULT 0,
  `total_travelers` INT NOT NULL DEFAULT 1,
  `subtotal_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `discount_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `tax_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `total_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `paid_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `remaining_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `currency` VARCHAR(10) DEFAULT 'USD',
  `travel_start_date` DATE NULL,
  `travel_end_date` DATE NULL,
  `special_requests` TEXT NULL,
  `internal_notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `deleted_at` TIMESTAMP NULL DEFAULT NULL,
  CONSTRAINT `fk_bk_cust` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `fk_bk_pkg` FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`),
  CONSTRAINT `fk_bk_dep` FOREIGN KEY (`departure_id`) REFERENCES `package_departures` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_bk_adm` FOREIGN KEY (`assigned_admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_bk_stat` FOREIGN KEY (`booking_status_id`) REFERENCES `booking_statuses` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `booking_travelers` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `booking_id` INT UNSIGNED NOT NULL,
  `linked_customer_id` INT UNSIGNED NULL,
  `first_name` VARCHAR(60) NOT NULL,
  `last_name` VARCHAR(60) NOT NULL,
  `gender` ENUM('Male', 'Female') NOT NULL,
  `date_of_birth` DATE NOT NULL,
  `nationality` VARCHAR(80) NOT NULL,
  `passport_number` VARCHAR(60) NOT NULL,
  `passport_expiry` DATE NOT NULL,
  `traveler_type` ENUM('Adult', 'Child', 'Infant') DEFAULT 'Adult',
  `room_type` VARCHAR(40) DEFAULT 'Double',
  `visa_number` VARCHAR(80) NULL,
  `visa_status` ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
  `special_requirements` TEXT NULL,
  CONSTRAINT `fk_bt_bk` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_bt_cust` FOREIGN KEY (`linked_customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 7. FINANCE, PAYMENTS, INVOICES & EXPENSES
-- ----------------------------------------------------------

CREATE TABLE `payment_methods` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(80) NOT NULL UNIQUE,
  `code` VARCHAR(40) NOT NULL UNIQUE,
  `is_active` TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `payments` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `payment_number` VARCHAR(50) NOT NULL UNIQUE,
  `booking_id` INT UNSIGNED NOT NULL,
  `customer_id` INT UNSIGNED NOT NULL,
  `payment_method_id` INT UNSIGNED NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `currency` VARCHAR(10) DEFAULT 'USD',
  `payment_date` DATE NOT NULL,
  `transaction_reference` VARCHAR(100) NULL,
  `status` ENUM('Completed', 'Pending', 'Failed', 'Refunded') DEFAULT 'Completed',
  `notes` TEXT NULL,
  `received_by_admin_id` INT UNSIGNED NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_pay_bk` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_pay_cust` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`),
  CONSTRAINT `fk_pay_mthd` FOREIGN KEY (`payment_method_id`) REFERENCES `payment_methods` (`id`),
  CONSTRAINT `fk_pay_adm` FOREIGN KEY (`received_by_admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `invoices` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `invoice_number` VARCHAR(50) NOT NULL UNIQUE,
  `booking_id` INT UNSIGNED NOT NULL,
  `customer_id` INT UNSIGNED NOT NULL,
  `issue_date` DATE NOT NULL,
  `due_date` DATE NOT NULL,
  `subtotal` DECIMAL(10, 2) NOT NULL,
  `tax_amount` DECIMAL(10, 2) DEFAULT 0.00,
  `discount_amount` DECIMAL(10, 2) DEFAULT 0.00,
  `total_amount` DECIMAL(10, 2) NOT NULL,
  `status` ENUM('Draft', 'Sent', 'Paid', 'Partially Paid', 'Cancelled', 'Overdue') DEFAULT 'Sent',
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_inv_bk` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_inv_cust` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `refunds` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `refund_number` VARCHAR(50) NOT NULL UNIQUE,
  `payment_id` INT UNSIGNED NOT NULL,
  `booking_id` INT UNSIGNED NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `reason` TEXT NOT NULL,
  `processed_by_admin_id` INT UNSIGNED NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_ref_pay` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`),
  CONSTRAINT `fk_ref_bk` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`),
  CONSTRAINT `fk_ref_adm` FOREIGN KEY (`processed_by_admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `expenses` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `category` VARCHAR(100) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `currency` VARCHAR(10) DEFAULT 'USD',
  `expense_date` DATE NOT NULL,
  `vendor` VARCHAR(150) NULL,
  `package_id` INT UNSIGNED NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_exp_pkg` FOREIGN KEY (`package_id`) REFERENCES `packages` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 8. FLIGHTS, VISA & TRANSPORT
-- ----------------------------------------------------------

CREATE TABLE `flights` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `airline_name` VARCHAR(100) NOT NULL,
  `airline_code` VARCHAR(10) NOT NULL,
  `flight_number` VARCHAR(20) NOT NULL,
  `departure_airport` VARCHAR(50) NOT NULL,
  `arrival_airport` VARCHAR(50) NOT NULL,
  `departure_city` VARCHAR(80) NOT NULL,
  `arrival_city` VARCHAR(80) NOT NULL,
  `departure_time` DATETIME NOT NULL,
  `arrival_time` DATETIME NOT NULL,
  `flight_type` ENUM('Direct', '1 Transit', '2 Transits') DEFAULT 'Direct',
  `transit_details` VARCHAR(255) NULL,
  `baggage_allowance` VARCHAR(80) DEFAULT '2 x 23kg + 7kg Hand',
  `status` ENUM('Scheduled', 'Delayed', 'Departed', 'Landed', 'Cancelled') DEFAULT 'Scheduled'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `flight_bookings` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `booking_id` INT UNSIGNED NOT NULL,
  `flight_id` INT UNSIGNED NOT NULL,
  `pnr_number` VARCHAR(40) NOT NULL,
  `ticket_number` VARCHAR(60) NULL,
  `eticket_file_url` VARCHAR(255) NULL,
  `status` ENUM('Confirmed', 'Issued', 'Cancelled') DEFAULT 'Confirmed',
  CONSTRAINT `fk_fb_bk` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_fb_fl` FOREIGN KEY (`flight_id`) REFERENCES `flights` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `visa_applications` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `booking_id` INT UNSIGNED NOT NULL,
  `traveler_id` INT UNSIGNED NOT NULL,
  `application_number` VARCHAR(60) NOT NULL UNIQUE,
  `visa_type` ENUM('Umrah E-Visa', 'Tourist E-Visa', 'Hajj Official Visa', 'Special') DEFAULT 'Umrah E-Visa',
  `submission_date` DATE NULL,
  `approval_date` DATE NULL,
  `mofa_number` VARCHAR(80) NULL,
  `visa_number` VARCHAR(80) NULL,
  `status` ENUM('Application Started', 'Docs Uploaded', 'MOFA Processing', 'Approved', 'Rejected') DEFAULT 'Application Started',
  `rejection_reason` TEXT NULL,
  `visa_file_url` VARCHAR(255) NULL,
  CONSTRAINT `fk_va_bk` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_va_trav` FOREIGN KEY (`traveler_id`) REFERENCES `booking_travelers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `transports` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `service_type` ENUM('Airport Transfer', 'Makkah to Madinah', 'Madinah to Makkah', 'Ziyarat Makkah', 'Ziyarat Madinah', 'VIP Private Car', 'Haramain Highspeed Train') NOT NULL,
  `vehicle_type` VARCHAR(100) NOT NULL DEFAULT 'GMC Yukon VIP / Luxury Coach',
  `capacity` INT NOT NULL DEFAULT 7,
  `driver_name` VARCHAR(100) NULL,
  `driver_phone` VARCHAR(40) NULL,
  `plate_number` VARCHAR(40) NULL,
  `status` ENUM('Available', 'Assigned', 'In Transit', 'Maintenance') DEFAULT 'Available'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `transport_bookings` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `booking_id` INT UNSIGNED NOT NULL,
  `transport_id` INT UNSIGNED NOT NULL,
  `pickup_location` VARCHAR(150) NOT NULL,
  `dropoff_location` VARCHAR(150) NOT NULL,
  `scheduled_time` DATETIME NOT NULL,
  `status` ENUM('Scheduled', 'Completed', 'Cancelled') DEFAULT 'Scheduled',
  CONSTRAINT `fk_tb_bk` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tb_tr` FOREIGN KEY (`transport_id`) REFERENCES `transports` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- 9. NOTIFICATIONS & AUDIT LOGS
-- ----------------------------------------------------------

CREATE TABLE `notifications` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `admin_id` INT UNSIGNED NULL,
  `type` VARCHAR(60) NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `message` TEXT NOT NULL,
  `link_url` VARCHAR(255) NULL,
  `is_read` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_notif_adm` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `audit_logs` (
  `id` BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `admin_id` INT UNSIGNED NULL,
  `action` VARCHAR(60) NOT NULL,
  `entity_type` VARCHAR(60) NOT NULL,
  `entity_id` VARCHAR(60) NULL,
  `details` TEXT NOT NULL,
  `ip_address` VARCHAR(45) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `fk_audit_adm` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==========================================================
-- SEED DATA (Default Roles, Permissions, Admin, Settings)
-- ==========================================================

INSERT INTO `admin_roles` (`id`, `slug`, `name`, `description`, `is_system`, `status`) VALUES
(1, 'super_admin', 'Super Administrator', 'Full unrestricted enterprise system access across all modules', 1, 'active'),
(2, 'operations_manager', 'Operations Manager', 'Full management over departures, packages, hotels, flights and transports', 1, 'active'),
(3, 'crm_sales_agent', 'CRM & Sales Agent', 'Customer CRM, lead inquiry processing, bookings and traveler relations', 1, 'active'),
(4, 'finance_officer', 'Finance & Accounts Officer', 'Payments, invoices, receipts, expenses, financial reconciliation', 1, 'active'),
(5, 'visa_specialist', 'Visa & Documentation Specialist', 'Pilgrim passports, MOFA submissions, visa approval workflows', 1, 'active'),
(6, 'cms_editor', 'Website Content Editor', 'CMS pages, sliders, banners, testimonials, media library', 1, 'active');

INSERT INTO `admin_permissions` (`module`, `action`, `name`, `description`) VALUES
('dashboard', 'view', 'View Dashboard', 'Access live KPIs and analytics charts'),
('packages', 'view', 'View Packages', 'Read package listings'),
('packages', 'manage', 'Manage Packages', 'Create, update, delete packages and departures'),
('hotels', 'view', 'View Hotels', 'Read hotel directories'),
('hotels', 'manage', 'Manage Hotels', 'Create and modify hotels and room allocations'),
('customers', 'view', 'View Customers', 'Access CRM customer profiles'),
('customers', 'manage', 'Manage Customers', 'Create, edit and manage customer records'),
('leads', 'view', 'View Leads', 'View inquiries and CRM leads'),
('leads', 'manage', 'Manage Leads', 'Process and convert inquiries into bookings'),
('bookings', 'view', 'View Bookings', 'View booking records'),
('bookings', 'manage', 'Manage Bookings', 'Create and process bookings and travelers'),
('finance', 'view', 'View Finance', 'View payments and invoices'),
('finance', 'manage', 'Manage Finance', 'Issue payments, invoices, refunds and expenses'),
('visas', 'view', 'View Visas', 'Track visa statuses and passport records'),
('visas', 'manage', 'Manage Visas', 'Verify documents and approve visas'),
('flights', 'manage', 'Manage Flights', 'Assign airlines, PNRs and e-tickets'),
('transport', 'manage', 'Manage Transport', 'Schedule and manage vehicles and drivers'),
('cms', 'manage', 'Manage CMS', 'Publish content, sliders, FAQs and testimonials'),
('media', 'manage', 'Manage Media', 'Upload and manage files in media library'),
('settings', 'manage', 'Manage Settings', 'Admin management, roles, and system parameters'),
('audit', 'view', 'View Audit Logs', 'Inspect system security and administrative logs');

-- Grant all permissions to Super Admin (Role 1)
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT 1, id FROM `admin_permissions`;

-- Initial Super Admin (Password hash for 'admin123' using bcrypt)
INSERT INTO `admins` (`id`, `role_id`, `first_name`, `last_name`, `username`, `email`, `phone`, `password`, `status`) VALUES
(1, 1, 'Atif', 'Khalil', 'superadmin', 'admin@hajjioriginal.com', '+966 50 123 4567', '$2b$10$3LarB2UPSbdPa4MwL5IGduX1.JQpylso2pE5rYU0OONmYx7Qp60oC', 'active');

-- Currencies
INSERT INTO `currencies` (`code`, `name`, `symbol`, `is_default`, `status`) VALUES
('USD', 'US Dollar', '$', 1, 'active'),
('SAR', 'Saudi Riyal', '﷼', 0, 'active'),
('GBP', 'British Pound', '£', 0, 'active'),
('EUR', 'Euro', '€', 0, 'active');

-- Exchange Rates
INSERT INTO `exchange_rates` (`from_currency`, `to_currency`, `rate`) VALUES
('USD', 'SAR', 3.750000),
('USD', 'GBP', 0.780000),
('USD', 'EUR', 0.920000);

-- Booking Statuses
INSERT INTO `booking_statuses` (`id`, `name`, `label`, `badge_color`) VALUES
(1, 'inquiry', 'Inquiry', '#94a3b8'),
(2, 'draft', 'Draft', '#e2e8f0'),
(3, 'confirmed', 'Confirmed', '#10b981'),
(4, 'in_progress', 'Travel In Progress', '#3b82f6'),
(5, 'completed', 'Completed', '#059669'),
(6, 'cancelled', 'Cancelled', '#ef4444');

-- Payment Methods
INSERT INTO `payment_methods` (`name`, `code`, `is_active`) VALUES
('Bank Transfer', 'bank_transfer', 1),
('Credit / Debit Card', 'card', 1),
('Cash at Office', 'cash', 1),
('Online Portal Checkout', 'online', 1);

-- Site Settings
INSERT INTO `site_settings` (`site_name`, `tagline`, `email`, `phone`, `whatsapp`, `address`) VALUES
('Hajji Original Tours', 'Official Luxury & Premium Hajj, Umrah & Spiritual Journeys', 'info@hajjioriginal.com', '+966 12 555 0199', '+966 50 123 4567', 'King Abdulaziz Road, Makkah Al Mukarramah, Kingdom of Saudi Arabia');

-- Seed Package Categories
INSERT INTO `package_categories` (`id`, `name`, `slug`, `type`, `description`) VALUES
(1, 'VIP Hajj Packages', 'vip-hajj-packages', 'hajj', 'Premium 5-Star front-row Haram hotels with luxury shifting tents in Mina.'),
(2, 'Classic Umrah Packages', 'classic-umrah-packages', 'umrah', 'Comprehensive all-inclusive Umrah packages with full visa processing and guided ziyarats.'),
(3, 'Ramadan Special Umrah', 'ramadan-special-umrah', 'ramadan_umrah', 'Experience the blessed last 10 days of Ramadan facing the holy Kaaba.');

-- Seed Packages
INSERT INTO `packages` (`id`, `category_id`, `title`, `slug`, `package_type`, `hajj_type`, `gregorian_year`, `duration_days`, `origin_city`, `starting_price`, `currency`, `total_seats`, `booked_seats`, `status`) VALUES
(1, 1, 'Royal Diamond 5-Star Hajj 2026', 'royal-diamond-5-star-hajj-2026', 'vip_hajj', 'non_shifting', 2026, 18, 'London Heathrow', 11500.00, 'USD', 60, 42, 'published'),
(2, 2, 'Deluxe Umrah Express Spring 2026', 'deluxe-umrah-express-spring-2026', 'umrah', 'not_applicable', 2026, 10, 'Manchester', 2150.00, 'USD', 80, 58, 'published'),
(3, 3, 'Ramadan Final 10 Nights Spiritual Retreat', 'ramadan-final-10-nights-spiritual-retreat', 'ramadan_umrah', 'not_applicable', 2026, 14, 'London Gatwick', 4100.00, 'USD', 40, 36, 'published');

-- Seed Departures
INSERT INTO `package_departures` (`id`, `package_id`, `departure_title`, `departure_date`, `return_date`, `total_seats`, `booked_seats`, `status`) VALUES
(1, 1, 'June 2026 Primary Departure', '2026-06-12', '2026-06-30', 60, 42, 'available'),
(2, 2, 'March 2026 Group A', '2026-03-15', '2026-03-25', 40, 32, 'almost_full'),
(3, 2, 'April 2026 Group B', '2026-04-05', '2026-04-15', 40, 26, 'available'),
(4, 3, 'Ramadan 2026 Departure', '2026-03-20', '2026-04-03', 40, 36, 'almost_full');

-- Seed Hotels
INSERT INTO `hotels` (`id`, `name`, `city`, `star_rating`, `distance_meters`, `shuttle_available`, `address`, `status`) VALUES
(1, 'Fairmont Makkah Clock Royal Tower', 'Makkah', 5, 50, 0, 'King Abdulaziz Endowment, Abraj Al Bait, Makkah', 'active'),
(2, 'Dar Al Taqwa Hotel Madinah', 'Madinah', 5, 30, 0, 'Opposite Holy Prophet Mosque North Courtyard, Madinah', 'active'),
(3, 'Swissôtel Makkah', 'Makkah', 5, 80, 0, 'Abraj Al Bait Complex, Makkah', 'active'),
(4, 'The Oberoi Madinah', 'Madinah', 5, 40, 0, 'Northern Central Area, Madinah', 'active');

-- Seed Hotel Rooms
INSERT INTO `hotel_rooms` (`id`, `hotel_id`, `room_name`, `room_type`, `view_type`, `capacity_adults`) VALUES
(1, 1, 'Deluxe Haram View Double', 'double', 'haram_view', 2),
(2, 1, 'Signature Kaaba View Quad', 'quad', 'kaaba_view', 4),
(3, 2, 'Superior Haram View Twin', 'double', 'haram_view', 2),
(4, 3, 'Classic City View Triple', 'triple', 'city_view', 3);

-- Seed Hotel Facilities
INSERT INTO `hotel_facilities` (`id`, `name`, `icon`) VALUES
(1, 'Haram View Rooms', 'eye'),
(2, 'Complimentary High-Speed Wi-Fi', 'wifi'),
(3, '24/7 Room Service & Dining', 'utensils'),
(4, 'Free Shuttle Service to Haram', 'bus'),
(5, 'Buffet Breakfast Included', 'coffee'),
(6, 'Wheelchair Accessible', 'accessibility'),
(7, 'Luggage Assistance & Concierge', 'briefcase'),
(8, 'Daily Housekeeping & Laundry', 'sparkles');

-- Seed Hotel Facility Relations
INSERT INTO `hotel_facility_relations` (`hotel_id`, `facility_id`) VALUES
(1, 1), (1, 2), (1, 3), (1, 5), (1, 7),
(2, 1), (2, 2), (2, 3), (2, 5), (2, 7),
(3, 1), (3, 2), (3, 3), (3, 5), (3, 7),
(4, 1), (4, 2), (4, 3), (4, 5), (4, 7);

-- Seed Customers
INSERT INTO `customers` (`id`, `customer_code`, `first_name`, `last_name`, `email`, `phone`, `whatsapp`, `nationality`, `country_of_residence`, `vip_level`, `status`, `lead_source`) VALUES
(1, 'CUST-2026-001', 'Mohammed', 'Al-Rahman', 'm.alrahman@example.co.uk', '+44 7700 900077', '+44 7700 900077', 'British', 'United Kingdom', 'Platinum', 'active', 'Referral'),
(2, 'CUST-2026-002', 'Farah', 'Siddiqui', 'farah.siddiqui@example.com', '+44 7700 900188', '+44 7700 900188', 'British', 'United Kingdom', 'Gold', 'active', 'Website'),
(3, 'CUST-2026-003', 'Tariq', 'Mansoor', 'tariq.mansoor@example.org', '+1 416 555 0144', '+1 416 555 0144', 'Canadian', 'Canada', 'Standard', 'active', 'Facebook Ads');

-- Seed Customer Passports
INSERT INTO `customer_passports` (`id`, `customer_id`, `passport_number`, `issuing_country`, `nationality`, `issue_date`, `expiry_date`, `status`) VALUES
(1, 1, 'GB84920199', 'United Kingdom', 'British', '2021-04-10', '2031-04-09', 'Valid'),
(2, 2, 'GB93021948', 'United Kingdom', 'British', '2022-08-15', '2032-08-14', 'Valid'),
(3, 3, 'CA50912401', 'Canada', 'Canadian', '2020-01-12', '2026-10-15', 'Expiring Soon');

-- Seed Leads
INSERT INTO `leads` (`id`, `full_name`, `email`, `phone`, `package_interest`, `destination`, `num_travelers`, `status`, `priority`) VALUES
(1, 'Dr. Imran Khan', 'imran.khan@hospital.uk', '+44 7911 123456', 'Royal Diamond 5-Star Hajj', 'Hajj', 2, 'Proposal Sent', 'High'),
(2, 'Amina Yusuf', 'amina.yusuf@family.com', '+44 7922 654321', 'Deluxe Umrah Express', 'Umrah', 4, 'Follow-up', 'Medium'),
(3, 'Zayd Qureshi', 'zayd.q@techcorp.com', '+1 512 555 8899', 'Ramadan Final 10 Nights', 'Umrah', 2, 'New', 'High');

-- Seed Bookings
INSERT INTO `bookings` (`id`, `booking_number`, `customer_id`, `package_id`, `departure_id`, `assigned_admin_id`, `booking_status_id`, `payment_status`, `visa_status`, `flight_status`, `hotel_status`, `num_adults`, `total_amount`, `paid_amount`, `remaining_amount`, `currency`, `travel_start_date`, `travel_end_date`) VALUES
(1, 'BK-2026-0089', 1, 1, 1, 1, 3, 'Partially Paid', 'Submitted to MOFA', 'Booked', 'Confirmed', 2, 23000.00, 15000.00, 8000.00, 'USD', '2026-06-12', '2026-06-30'),
(2, 'BK-2026-0092', 2, 2, 2, 1, 3, 'Fully Paid', 'Approved', 'Ticketed', 'Confirmed', 2, 4300.00, 4300.00, 0.00, 'USD', '2026-03-15', '2026-03-25'),
(3, 'BK-2026-0095', 3, 3, 4, 1, 1, 'Unpaid', 'Documents Pending', 'Unassigned', 'Pending', 2, 8200.00, 0.00, 8200.00, 'USD', '2026-03-20', '2026-04-03');

-- Seed Booking Travelers
INSERT INTO `booking_travelers` (`id`, `booking_id`, `linked_customer_id`, `first_name`, `last_name`, `gender`, `date_of_birth`, `nationality`, `passport_number`, `passport_expiry`, `visa_status`) VALUES
(1, 1, 1, 'Mohammed', 'Al-Rahman', 'Male', '1982-05-14', 'British', 'GB84920199', '2031-04-09', 'Pending'),
(2, 1, NULL, 'Zahra', 'Al-Rahman', 'Female', '1985-09-22', 'British', 'GB84920200', '2031-04-09', 'Pending'),
(3, 2, 2, 'Farah', 'Siddiqui', 'Female', '1990-11-03', 'British', 'GB93021948', '2032-08-14', 'Approved'),
(4, 2, NULL, 'Hamza', 'Siddiqui', 'Male', '1988-02-18', 'British', 'GB93021949', '2032-08-14', 'Approved');

-- Seed Payments
INSERT INTO `payments` (`id`, `payment_number`, `booking_id`, `customer_id`, `payment_method_id`, `amount`, `currency`, `payment_date`, `transaction_reference`, `status`, `received_by_admin_id`) VALUES
(1, 'PAY-2026-0101', 1, 1, 1, 15000.00, 'USD', '2026-01-20', 'CHASE-WIRE-882193', 'Completed', 1),
(2, 'PAY-2026-0102', 2, 2, 2, 4300.00, 'USD', '2026-02-10', 'STRIPE-CH-992140', 'Completed', 1);

-- Seed Invoices
INSERT INTO `invoices` (`id`, `invoice_number`, `booking_id`, `customer_id`, `issue_date`, `due_date`, `subtotal`, `tax_amount`, `total_amount`, `status`) VALUES
(1, 'INV-2026-0001', 1, 1, '2026-01-15', '2026-05-01', 23000.00, 0.00, 23000.00, 'Partially Paid'),
(2, 'INV-2026-0002', 2, 2, '2026-02-05', '2026-02-28', 4300.00, 0.00, 4300.00, 'Paid'),
(3, 'INV-2026-0003', 3, 3, '2026-02-18', '2026-03-01', 8200.00, 0.00, 8200.00, 'Sent');

-- Seed Flights
INSERT INTO `flights` (`id`, `airline_name`, `airline_code`, `flight_number`, `departure_airport`, `arrival_airport`, `departure_city`, `arrival_city`, `departure_time`, `arrival_time`, `status`) VALUES
(1, 'Saudia (Saudi Arabian Airlines)', 'SV', 'SV116', 'LHR', 'JED', 'London', 'Jeddah', '2026-06-12 10:30:00', '2026-06-12 18:45:00', 'Scheduled'),
(2, 'British Airways', 'BA', 'BA263', 'LHR', 'MED', 'London', 'Madinah', '2026-03-15 08:15:00', '2026-03-15 16:30:00', 'Scheduled');

-- Seed Flight Bookings
INSERT INTO `flight_bookings` (`id`, `booking_id`, `flight_id`, `pnr_number`, `ticket_number`, `status`) VALUES
(1, 1, 1, 'SV89KQ', '065-2983019283', 'Confirmed'),
(2, 2, 2, 'BA942X', '125-9983102941', 'Issued');

-- Seed Transports
INSERT INTO `transports` (`id`, `service_type`, `vehicle_type`, `capacity`, `driver_name`, `driver_phone`, `status`) VALUES
(1, 'Airport Transfer', 'GMC Yukon XL 2026 VIP', 7, 'Abu Fahad Al-Harbi', '+966 54 991 2288', 'Available'),
(2, 'Makkah to Madinah', 'Mercedes Travego 49-Seat Luxury Coach', 49, 'Kareem Othman', '+966 56 123 9900', 'Available');

-- Seed Notifications
INSERT INTO `notifications` (`admin_id`, `type`, `title`, `message`, `link_url`, `is_read`) VALUES
(1, 'new_booking', 'New Booking Received', 'Booking #BK-2026-0095 has been created for Ramadan Final 10 Nights.', '/bookings', 0),
(1, 'passport_expiring', 'Passport Expiring Soon', 'Pilgrim Tariq Mansoor passport (CA50912401) expires within 6 months.', '/visas', 0),
(1, 'payment_received', 'Payment Verified', 'CHASE-WIRE-882193 for $15,000.00 confirmed for Booking #BK-2026-0089.', '/finance', 1);

-- Seed System Settings
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `group_name`) VALUES
('company_name', 'Hajji Original Tours & Travel Management Ltd.', 'company'),
('license_number', 'IATA-962019 / Saudi Ministry of Hajj & Umrah License #1088', 'company'),
('support_email', 'support@hajjioriginal.com', 'contact'),
('vat_registered', '1', 'tax'),
('vat_number', 'GB 992 108 421', 'tax'),
('default_currency', 'USD', 'financial'),
('auto_invoice', '1', 'booking'),
('passport_expiry_buffer_months', '6', 'visa');

SET FOREIGN_KEY_CHECKS = 1;
