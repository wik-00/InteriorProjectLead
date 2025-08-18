<?php
/**
 * Paytm Checksum Library for PHP
 * This is a simplified version - for production use Paytm's official library
 */

class PaytmChecksum {
    
    private static $iv = "@@@@&&&&####$$$$";
    
    /**
     * Generate checksum for Paytm
     */
    public static function generateSignature($params, $key) {
        if (!is_array($params) && !is_string($params)) {
            throw new Exception("String or array expected, ".gettype($params)." given");
        }
        if (is_array($params)) {
            $params = self::getStringByParams($params);
        }
        return self::generateSignatureByString($params, $key);
    }
    
    /**
     * Verify checksum
     */
    public static function verifySignature($params, $key, $checksum) {
        if (!is_array($params) && !is_string($params)) {
            throw new Exception("String or array expected, ".gettype($params)." given");
        }
        if (isset($params['CHECKSUMHASH'])) {
            unset($params['CHECKSUMHASH']);
        }
        if (is_array($params)) {
            $params = self::getStringByParams($params);
        }
        return self::verifySignatureByString($params, $key, $checksum);
    }
    
    private static function generateSignatureByString($params, $key) {
        $salt = self::generateRandomString(4);
        return self::calculateChecksum($params, $key, $salt);
    }
    
    private static function verifySignatureByString($params, $key, $checksum) {
        $paytm_hash = self::decrypt($checksum, $key);
        $salt = substr($paytm_hash, -4);
        return $paytm_hash == self::calculateHash($params, $salt);
    }
    
    private static function generateRandomString($length) {
        $random = "";
        srand((double) microtime() * 1000000);
        $data = "AbcDE123IJKLMN67QRSTUVWXYZ";
        $data .= "aBCdefghijklmn123opq45rs67tuv89wxyz";
        $data .= "0FGH45OP89";
        for ($i = 0; $i < $length; $i++) {
            $random .= substr($data, (rand() % (strlen($data))), 1);
        }
        return $random;
    }
    
    private static function getStringByParams($params) {
        ksort($params);
        $string = "";
        foreach ($params as $key => $value) {
            $string .= $key . "=" . $value . "&";
        }
        return rtrim($string, "&");
    }
    
    private static function calculateHash($params, $salt) {
        $finalString = $params . "|" . $salt;
        $hash = hash("sha256", $finalString);
        return $hash . $salt;
    }
    
    private static function calculateChecksum($params, $key, $salt) {
        $hashString = self::calculateHash($params, $salt);
        return self::encrypt($hashString, $key);
    }
    
    private static function encrypt($input, $ky) {
        $key = html_entity_decode($ky);
        $iv = self::$iv;
        $data = openssl_encrypt($input, 'AES-128-CBC', $key, 0, $iv);
        return base64_encode($data);
    }
    
    private static function decrypt($encrypted, $ky) {
        $key = html_entity_decode($ky);
        $iv = self::$iv;
        $data = base64_decode($encrypted);
        return openssl_decrypt($data, 'AES-128-CBC', $key, 0, $iv);
    }
}
?>