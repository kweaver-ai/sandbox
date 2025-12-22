import paramiko
import logging
from typing import Optional, Tuple, Dict, Any
from pathlib import Path
import os

logger = logging.getLogger(__name__)

class SSHClient:
    """SSH client for remote command execution"""
    
    def __init__(
        self,
        hostname: str,
        username: str,
        password: Optional[str] = None,
        key_filename: Optional[str] = None,
        port: int = 22,
        timeout: int = 30
    ):
        """
        Initialize SSH client
        
        Args:
            hostname: Remote host address
            username: SSH username
            password: SSH password (optional if using key)
            key_filename: Path to private key file (optional if using password)
            port: SSH port (default: 22)
            timeout: Connection timeout in seconds (default: 30)
        """
        self.hostname = hostname
        self.username = username
        self.password = password
        self.key_filename = key_filename
        self.port = port
        self.timeout = timeout
        self.client = None
        
    def connect(self) -> None:
        """Establish SSH connection"""
        try:
            self.client = paramiko.SSHClient()
            self.client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            
            # Connect using either password or key
            if self.key_filename:
                self.client.connect(
                    hostname=self.hostname,
                    username=self.username,
                    key_filename=self.key_filename,
                    port=self.port,
                    timeout=self.timeout
                )
            else:
                self.client.connect(
                    hostname=self.hostname,
                    username=self.username,
                    password=self.password,
                    port=self.port,
                    timeout=self.timeout
                )
            logger.info(f"Successfully connected to {self.hostname}")
            
        except Exception as e:
            logger.error(f"Failed to connect to {self.hostname}: {str(e)}")
            raise
            
    def disconnect(self) -> None:
        """Close SSH connection"""
        if self.client:
            self.client.close()
            self.client = None
            logger.info(f"Disconnected from {self.hostname}")
            
    def execute_command(
        self,
        command: str,
        timeout: Optional[int] = None
    ) -> Tuple[int, str, str]:
        """
        Execute command on remote host
        
        Args:
            command: Command to execute
            timeout: Command timeout in seconds (optional)
            
        Returns:
            Tuple of (exit_code, stdout, stderr)
        """
        if not self.client:
            raise RuntimeError("Not connected to SSH server")
            
        try:
            logger.info(f"Executing command: {command}")
            stdin, stdout, stderr = self.client.exec_command(
                command,
                timeout=timeout or self.timeout
            )
            
            exit_code = stdout.channel.recv_exit_status()
            stdout_str = stdout.read().decode('utf-8')
            stderr_str = stderr.read().decode('utf-8')
            
            logger.debug(f"Command exit code: {exit_code}")
            if stdout_str:
                logger.debug(f"Command stdout: {stdout_str}")
            if stderr_str:
                logger.debug(f"Command stderr: {stderr_str}")
                
            return exit_code, stdout_str, stderr_str
            
        except Exception as e:
            logger.error(f"Failed to execute command: {str(e)}")
            raise
            
    def upload_file(
        self,
        local_path: str,
        remote_path: str
    ) -> None:
        """
        Upload file to remote host
        
        Args:
            local_path: Path to local file
            remote_path: Path on remote host
        """
        if not self.client:
            raise RuntimeError("Not connected to SSH server")
            
        try:
            sftp = self.client.open_sftp()
            sftp.put(local_path, remote_path)
            sftp.close()
            logger.info(f"Successfully uploaded {local_path} to {remote_path}")
            
        except Exception as e:
            logger.error(f"Failed to upload file: {str(e)}")
            raise
            
    def download_file(
        self,
        remote_path: str,
        local_path: str
    ) -> None:
        """
        Download file from remote host
        
        Args:
            remote_path: Path on remote host
            local_path: Path to save file locally
        """
        if not self.client:
            raise RuntimeError("Not connected to SSH server")
            
        try:
            sftp = self.client.open_sftp()
            sftp.get(remote_path, local_path)
            sftp.close()
            logger.info(f"Successfully downloaded {remote_path} to {local_path}")
            
        except Exception as e:
            logger.error(f"Failed to download file: {str(e)}")
            raise
            
    def __enter__(self):
        """Context manager entry"""
        self.connect()
        return self
        
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.disconnect() 