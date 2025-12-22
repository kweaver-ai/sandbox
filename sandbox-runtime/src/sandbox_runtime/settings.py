# -*- coding: utf-8 -*-
# @Author:  Xavier.chen@aishu.cn
# @Date: 2024-8-26

import os

from pydantic_settings import BaseSettings, SettingsConfigDict



class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # 日志配置
    log_level: str = "INFO"

    # Jupyter Gateway配置
    JUPYTER_GATEWAY_URL: str = "http://localhost:8000"

    # Workspace Expiration Time
    WORKSPACE_EXPIRATION_TIME: int = 60 * 60 * 24 # 24 hours
    
    # Efast Downloader URL
    EFAST_DOWNLOADER_URL: str = "http://efast-private:9123"
    DOWNLOADER_TIMEOUT: int = 300


_SETTINGS = Settings()


def get_settings():
    return _SETTINGS

