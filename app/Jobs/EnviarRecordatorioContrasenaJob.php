<?php

namespace App\Jobs;

use App\Models\User;
use App\Notifications\RecordatorioContrasenaNotification;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class EnviarRecordatorioContrasenaJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(private int $userId) {}

    public function handle(): void
    {
        $user = User::find($this->userId);

        if ($user && $user->must_change_password) {
            $user->notify(new RecordatorioContrasenaNotification);
        }
    }
}
