-- Tabla para guardar contraseñas de usuarios del portal
-- Ya que pNetUsuario no tiene campo de password

USE PP;
GO

-- Verificar si la tabla ya existe
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'pNetUsuarioPassword')
BEGIN
    CREATE TABLE pNetUsuarioPassword (
        IDUsuario           INT NOT NULL,
        PasswordHash        VARCHAR(255) NOT NULL,
        CreatedAt           DATETIME2 NOT NULL DEFAULT GETDATE(),
        UpdatedAt           DATETIME2 NULL,

        CONSTRAINT PK_pNetUsuarioPassword PRIMARY KEY (IDUsuario),
        CONSTRAINT FK_pNetUsuarioPassword_Usuario
            FOREIGN KEY (IDUsuario) REFERENCES pNetUsuario(IDUsuario)
            ON DELETE CASCADE
    );

    CREATE INDEX idx_pNetUsuarioPassword_IDUsuario ON pNetUsuarioPassword(IDUsuario);

    PRINT '✅ Tabla pNetUsuarioPassword creada exitosamente';
END
ELSE
BEGIN
    PRINT '⚠️  Tabla pNetUsuarioPassword ya existe';
END
GO

-- Insertar contraseñas para usuarios de prueba
-- Password para proveedor@test.com: Test123!
-- Hash bcrypt: $2b$10$... (se generará en el script)

PRINT '';
PRINT 'Tabla pNetUsuarioPassword lista para usar';
PRINT '';
PRINT 'Uso:';
PRINT '  INSERT INTO pNetUsuarioPassword (IDUsuario, PasswordHash)';
PRINT '  VALUES (3, ''$2b$10$hash_aqui'')';
PRINT '';
