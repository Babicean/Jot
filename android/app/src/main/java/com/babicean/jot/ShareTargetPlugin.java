package com.babicean.jot;

import android.content.Intent;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Receives text shared into Jot (ACTION_SEND) and the "new jot" app
 * shortcut, and hands them to the web app. The web side polls
 * getPendingShare() at boot and listens for shareReceived while running.
 */
@CapacitorPlugin(name = "ShareTarget")
public class ShareTargetPlugin extends Plugin {

    static final String ACTION_NEW_JOT = "com.babicean.jot.NEW_JOT";

    private String pendingText = "";
    private boolean pendingNewJot = false;

    @Override
    public void load() {
        // Cold start: the launching intent may already carry a share.
        if (getActivity() != null) {
            capture(getActivity().getIntent());
        }
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        // Warm start (singleTask): the app was already running.
        if (capture(intent)) {
            notifyListeners("shareReceived", consume());
        }
    }

    private boolean capture(Intent intent) {
        if (intent == null) {
            return false;
        }
        String action = intent.getAction();
        String type = intent.getType();
        if (Intent.ACTION_SEND.equals(action) && type != null && type.startsWith("text/")) {
            String text = intent.getStringExtra(Intent.EXTRA_TEXT);
            if (text != null && !text.trim().isEmpty()) {
                pendingText = text.trim();
                return true;
            }
        }
        if (ACTION_NEW_JOT.equals(action)) {
            pendingNewJot = true;
            return true;
        }
        return false;
    }

    private JSObject consume() {
        JSObject data = new JSObject();
        data.put("text", pendingText);
        data.put("newJot", pendingNewJot);
        pendingText = "";
        pendingNewJot = false;
        return data;
    }

    @PluginMethod
    public void getPendingShare(PluginCall call) {
        call.resolve(consume());
    }
}
