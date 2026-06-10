<?php
/**
 * Plugin Name: GEO Commerce Connector
 * Description: 将 WooCommerce 产品与订单同步到 GEO Commerce 管理后台，助力 WordPress 独立站 GEO 优化。
 * Version: 0.1.0
 * Author: GEO Commerce
 * Requires at least: 5.8
 * Requires PHP: 7.4
 * Text Domain: geo-commerce-connector
 */

if (!defined('ABSPATH')) {
    exit;
}

define('GEO_COMMERCE_VERSION', '0.1.0');
define('GEO_COMMERCE_OPTION', 'geo_commerce_settings');

final class GEO_Commerce_Connector {
    public function __construct() {
        add_action('admin_menu', [$this, 'admin_menu']);
        add_action('admin_init', [$this, 'register_settings']);
        add_action('save_post_product', [$this, 'sync_product'], 20, 1);
        add_action('woocommerce_update_product', [$this, 'sync_product'], 20, 1);
        add_action('woocommerce_order_status_changed', [$this, 'sync_order'], 20, 1);
        add_action('woocommerce_new_order', [$this, 'sync_order'], 20, 1);
    }

    public static function settings(): array {
        return wp_parse_args(
            get_option(GEO_COMMERCE_OPTION, []),
            [
                'api_base' => '',
                'api_key'  => '',
                'enabled'  => '1',
            ]
        );
    }

    public function admin_menu(): void {
        add_options_page(
            'GEO Commerce',
            'GEO Commerce',
            'manage_options',
            'geo-commerce',
            [$this, 'settings_page']
        );
        // WooCommerce 菜单下也显示，方便查找
        if (class_exists('WooCommerce')) {
            add_submenu_page(
                'woocommerce',
                'GEO Commerce 同步',
                'GEO Commerce',
                'manage_options',
                'geo-commerce',
                [$this, 'settings_page']
            );
        }
    }

    public function register_settings(): void {
        register_setting(GEO_COMMERCE_OPTION, GEO_COMMERCE_OPTION, [
            'sanitize_callback' => function ($input) {
                return [
                    'api_base' => esc_url_raw(rtrim($input['api_base'] ?? '', '/')),
                    'api_key'  => sanitize_text_field($input['api_key'] ?? ''),
                    'enabled'  => !empty($input['enabled']) ? '1' : '0',
                ];
            },
        ]);
    }

    public function settings_page(): void {
        $s = self::settings();
        ?>
        <div class="wrap">
            <h1>GEO Commerce 同步设置</h1>
            <p>连接你的 GEO Commerce 管理后台（本地或云端）。在后台 <strong>WordPress 集成</strong> 页面复制 API 地址与密钥。</p>
            <form method="post" action="options.php">
                <?php settings_fields(GEO_COMMERCE_OPTION); ?>
                <table class="form-table">
                    <tr>
                        <th><label for="api_base">GEO API 地址</label></th>
                        <td>
                            <input type="url" id="api_base" name="<?php echo esc_attr(GEO_COMMERCE_OPTION); ?>[api_base]"
                                   value="<?php echo esc_attr($s['api_base']); ?>" class="regular-text"
                                   placeholder="https://geo.fancrafti.com" />
                            <p class="description">线上店填 HTTPS 公网地址，如 https://geo.fancrafti.com（不要末尾斜杠）。本地开发才用 http://localhost:3000</p>
                        </td>
                    </tr>
                    <tr>
                        <th><label for="api_key">API 密钥</label></th>
                        <td>
                            <input type="password" id="api_key" name="<?php echo esc_attr(GEO_COMMERCE_OPTION); ?>[api_key]"
                                   value="<?php echo esc_attr($s['api_key']); ?>" class="large-text" />
                            <p class="description">对应后台站点中的 X-GEO-API-Key</p>
                        </td>
                    </tr>
                    <tr>
                        <th>启用同步</th>
                        <td>
                            <label>
                                <input type="checkbox" name="<?php echo esc_attr(GEO_COMMERCE_OPTION); ?>[enabled]" value="1"
                                    <?php checked($s['enabled'], '1'); ?> />
                                保存产品 / 订单时自动同步
                            </label>
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }

    private function post_json(string $path, array $body): void {
        $s = self::settings();
        if ($s['enabled'] !== '1' || empty($s['api_base']) || empty($s['api_key'])) {
            return;
        }

        $url = $s['api_base'] . $path;
        wp_remote_post($url, [
            'timeout' => 15,
            'headers' => [
                'Content-Type'  => 'application/json',
                'X-GEO-API-Key' => $s['api_key'],
            ],
            'body' => wp_json_encode($body),
        ]);
    }

    public function sync_product($product_id): void {
        if (!function_exists('wc_get_product')) {
            return;
        }
        $product = wc_get_product($product_id);
        if (!$product) {
            return;
        }

        $categories = wp_get_post_terms($product_id, 'product_cat', ['fields' => 'names']);
        $category_path = is_array($categories) ? implode('/', $categories) : '';

        $this->post_json('/api/integrations/wordpress/products', [
            'externalId'  => (string) $product_id,
            'title'       => $product->get_name(),
            'slug'        => $product->get_slug(),
            'sku'         => $product->get_sku(),
            'description' => $product->get_description() ?: $product->get_short_description(),
            'price'       => (float) $product->get_price(),
            'currency'    => get_woocommerce_currency(),
            'category'    => $category_path,
            'url'         => get_permalink($product_id),
        ]);
    }

    public function sync_order($order_id): void {
        if (!function_exists('wc_get_order')) {
            return;
        }
        $order = wc_get_order($order_id);
        if (!$order) {
            return;
        }

        $items = [];
        foreach ($order->get_items() as $item) {
            $product = $item->get_product();
            $items[] = [
                'sku'       => $product ? $product->get_sku() : (string) $item->get_product_id(),
                'title'     => $item->get_name(),
                'quantity'  => (int) $item->get_quantity(),
                'unitPrice' => (float) $order->get_item_total($item, false, false),
            ];
        }

        $this->post_json('/api/integrations/wordpress/orders', [
            'externalId'         => (string) $order_id,
            'orderNumber'        => (string) $order->get_order_number(),
            'userId'             => $order->get_customer_id() ? (string) $order->get_customer_id() : 'guest',
            'status'             => $order->get_status(),
            'billing'            => [
                'first_name' => $order->get_billing_first_name(),
                'last_name'  => $order->get_billing_last_name(),
                'phone'      => $order->get_billing_phone(),
                'email'      => $order->get_billing_email(),
            ],
            'shipping'           => [
                'country'   => $order->get_shipping_country(),
                'state'     => $order->get_shipping_state(),
                'city'      => $order->get_shipping_city(),
                'postcode'  => $order->get_shipping_postcode(),
                'address_1' => $order->get_shipping_address_1(),
                'address_2' => $order->get_shipping_address_2(),
            ],
            'currency'           => $order->get_currency(),
            'total'              => (float) $order->get_total(),
            'customer_note'      => $order->get_customer_note(),
            'line_items'         => $items,
        ]);
    }
}

new GEO_Commerce_Connector();
