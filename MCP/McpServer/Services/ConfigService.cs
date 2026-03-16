using System.Text.Json;
using McpServer.Models;

namespace McpServer.Services;

/// <summary>
/// Loads and persists server configuration to <c>config.json</c> on disk.
/// </summary>
public sealed class ConfigService
{
    private static readonly JsonSerializerOptions s_opts = new() { WriteIndented = true };

    private readonly string _configPath;
    private AppConfig _current;
    private readonly SemaphoreSlim _sem = new(1, 1);

    public ConfigService(IWebHostEnvironment env)
    {
        _configPath = Path.Combine(env.ContentRootPath, "config.json");
        _current    = LoadOrDefault();
    }

    public Task<AppConfig> GetAsync() => Task.FromResult(_current);

    public async Task SaveAsync(AppConfig config)
    {
        await _sem.WaitAsync();
        try
        {
            _current = config;
            var json = JsonSerializer.Serialize(config, s_opts);
            await File.WriteAllTextAsync(_configPath, json);
        }
        finally
        {
            _sem.Release();
        }
    }

    private AppConfig LoadOrDefault()
    {
        if (!File.Exists(_configPath)) return new AppConfig();
        try
        {
            var json = File.ReadAllText(_configPath);
            return JsonSerializer.Deserialize<AppConfig>(json) ?? new AppConfig();
        }
        catch
        {
            return new AppConfig();
        }
    }
}
