import { JuiceWordError } from '../shared/errors';
import type { ProviderTranslateRequest, ProviderTranslateResponse, TranslationProvider } from './providerTypes';

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

export class OpenAICompatibleProvider implements TranslationProvider {
  async translate(request: ProviderTranslateRequest): Promise<ProviderTranslateResponse> {
    const { config, prompt } = request;

    if (!config.apiKey) {
      throw new JuiceWordError('Please configure your API Key first.', 'missing-api-key');
    }

    if (!config.model) {
      throw new JuiceWordError('Please configure your model first.', 'missing-model');
    }

    const endpoint = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model,
        temperature: config.temperature ?? 1,
        messages: [
          {
            role: 'system',
            content: 'You are JuiceWord, a concise translation assistant.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    const data = (await response.json().catch(() => ({}))) as ChatCompletionResponse;

    if (!response.ok) {
      throw new JuiceWordError(
        data.error?.message || `Translation request failed with status ${response.status}.`,
        'provider-error',
      );
    }

    const text = data.choices?.[0]?.message?.content?.trim();

    if (!text) {
      throw new JuiceWordError('The model returned an empty translation.', 'empty-provider-result');
    }

    return { text };
  }
}
