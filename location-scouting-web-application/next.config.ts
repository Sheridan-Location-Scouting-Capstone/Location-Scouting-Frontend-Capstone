import type { NextConfig } from "next";

module.exports = {
    experimental: {
        serverActions: {
            bodySizeLimit: '50mb',
        }
    }
}


const nextConfig: NextConfig = {
    experimental: {
        serverActions: {
            bodySizeLimit: '50mb',
        }
    }
};

export default nextConfig;
