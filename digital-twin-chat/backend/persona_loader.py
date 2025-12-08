"""
Persona Loader - Loads persona content from filesystem or S3
Supports both text files (.txt) and PDF files (.pdf)
"""
import logging
import os
from typing import Optional
from pathlib import Path
import boto3
from botocore.exceptions import ClientError
from retry_utils import retry_with_backoff, RetryConfig

# PDF parsing
try:
    from PyPDF2 import PdfReader
    PDF_SUPPORT = True
except ImportError:
    PDF_SUPPORT = False
    logging.warning("PyPDF2 not installed. PDF support disabled. Install with: pip install pypdf2")

logger = logging.getLogger(__name__)


class PersonaLoader:
    """Loads and caches persona content from local filesystem or S3"""
    
    def __init__(self):
        self.environment = os.getenv("ENVIRONMENT", "local")
        self._cached_persona: Optional[str] = None
        
        # Configuration for local environment
        self.local_persona_path = os.getenv("LOCAL_PERSONA_PATH", "./me.txt")
        
        # Configuration for AWS environment
        self.s3_bucket = os.getenv("S3_PERSONA_BUCKET", "")
        self.s3_key = os.getenv("PERSONA_FILE_KEY", "me.txt")
        self.aws_region = os.getenv("AWS_REGION", "us-east-1")
        
        if self.environment != "local" and self.s3_bucket:
            self.s3_client = boto3.client('s3', region_name=self.aws_region)
        else:
            self.s3_client = None
            
        logger.info(f"PersonaLoader initialized for environment: {self.environment}")
    
    def load_persona(self, force_reload: bool = False) -> str:
        """
        Load persona content from filesystem or S3
        
        Args:
            force_reload: If True, bypass cache and reload from source
            
        Returns:
            Persona content as string
            
        Raises:
            FileNotFoundError: If persona file is not found
            Exception: For other errors during loading
        """
        # Return cached content if available and not forcing reload
        if self._cached_persona is not None and not force_reload:
            logger.debug("Returning cached persona content")
            return self._cached_persona
        
        try:
            if self.environment == "local":
                persona_content = self._load_from_filesystem()
            else:
                persona_content = self._load_from_s3()
            
            # Cache the loaded content
            self._cached_persona = persona_content
            logger.info(f"Persona loaded successfully ({len(persona_content)} characters)")
            return persona_content
            
        except FileNotFoundError as e:
            logger.error(f"Persona file not found: {e}")
            raise
        except Exception as e:
            logger.error(f"Error loading persona: {e}")
            raise
    
    def _load_from_filesystem(self) -> str:
        """Load persona from local filesystem (supports .txt and .pdf files)"""
        logger.info(f"Loading persona from local file: {self.local_persona_path}")
        
        if not os.path.exists(self.local_persona_path):
            raise FileNotFoundError(f"Persona file not found at: {self.local_persona_path}")
        
        # Determine file type
        file_path = Path(self.local_persona_path)
        file_extension = file_path.suffix.lower()
        
        if file_extension == '.pdf':
            content = self._extract_text_from_pdf(self.local_persona_path)
        elif file_extension == '.txt':
            with open(self.local_persona_path, 'r', encoding='utf-8') as f:
                content = f.read()
        else:
            # Try to read as text file by default
            logger.warning(f"Unknown file extension '{file_extension}', attempting to read as text")
            with open(self.local_persona_path, 'r', encoding='utf-8') as f:
                content = f.read()
        
        if not content.strip():
            logger.warning("Persona file is empty")
        
        return content
    
    def _extract_text_from_pdf(self, pdf_path: str) -> str:
        """
        Extract text content from a PDF file
        
        Args:
            pdf_path: Path to the PDF file
            
        Returns:
            Extracted text content
            
        Raises:
            RuntimeError: If PDF support is not available
            Exception: For PDF parsing errors
        """
        if not PDF_SUPPORT:
            raise RuntimeError(
                "PDF support not available. Install PyPDF2: pip install pypdf2"
            )
        
        logger.info(f"Extracting text from PDF: {pdf_path}")
        
        try:
            reader = PdfReader(pdf_path)
            text_content = []
            
            # Extract text from all pages
            for page_num, page in enumerate(reader.pages, start=1):
                page_text = page.extract_text()
                if page_text:
                    text_content.append(page_text)
                    logger.debug(f"Extracted {len(page_text)} characters from page {page_num}")
            
            full_text = "\n\n".join(text_content)
            logger.info(f"Successfully extracted {len(full_text)} characters from {len(reader.pages)} pages")
            
            return full_text
            
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {e}", exc_info=True)
            raise Exception(f"Failed to extract text from PDF: {e}")
    
    @retry_with_backoff(config=RetryConfig(max_attempts=3, initial_delay=1.0))
    def _load_from_s3(self) -> str:
        """Load persona from S3 with retry logic"""
        logger.info(f"Loading persona from S3: s3://{self.s3_bucket}/{self.s3_key}")
        
        if not self.s3_client:
            raise RuntimeError("S3 client not initialized")
        
        try:
            response = self.s3_client.get_object(Bucket=self.s3_bucket, Key=self.s3_key)
            content = response['Body'].read().decode('utf-8')
            
            if not content.strip():
                logger.warning("Persona file from S3 is empty")
            
            return content
            
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == 'NoSuchKey':
                logger.error(f"Persona file not found in S3: s3://{self.s3_bucket}/{self.s3_key}", exc_info=True)
                raise FileNotFoundError(f"Persona file not found in S3: s3://{self.s3_bucket}/{self.s3_key}")
            elif error_code == 'NoSuchBucket':
                logger.error(f"S3 bucket not found: {self.s3_bucket}", exc_info=True)
                raise FileNotFoundError(f"S3 bucket not found: {self.s3_bucket}")
            else:
                logger.error(f"S3 error loading persona: {e}", exc_info=True)
                raise Exception(f"S3 error: {e}")
    
    def clear_cache(self):
        """Clear the cached persona content"""
        logger.info("Clearing persona cache")
        self._cached_persona = None
